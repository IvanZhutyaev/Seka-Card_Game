import logging
logger = logging.getLogger(__name__)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from game.engine import GameState
from typing import Dict, Set, Optional
import hashlib
import hmac
from urllib.parse import parse_qsl, unquote
import os
from datetime import datetime
import redis.asyncio as redis
import time
from config import REDIS_CONFIG
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sys
import asyncio

# Настройка логирования
LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'
LOG_LEVEL = logging.DEBUG  # Изменяем уровень логирования на DEBUG

# Создаем директорию для логов если её нет
os.makedirs('logs', exist_ok=True)

# Настраиваем логирование в файл
file_handler = logging.FileHandler('logs/app.log')
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
file_handler.setLevel(LOG_LEVEL)

# Настраиваем логирование в консоль
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
console_handler.setLevel(LOG_LEVEL)

# Настраиваем корневой логгер
root_logger = logging.getLogger()
root_logger.setLevel(LOG_LEVEL)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Создаем логгер для нашего приложения
logger = logging.getLogger('seka_game')
logger.setLevel(LOG_LEVEL)

logger.info('Starting application...')

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Telegram-Web-App-Init-Data"],
    expose_headers=["*"]
)

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/pages", StaticFiles(directory="pages"), name="pages")
app.mount("/build", StaticFiles(directory="build"), name="react_build")

# Добавляем маршрут для React приложения
@app.get("/game/{full_path:path}")
async def serve_react_app(request: Request, full_path: str):
    return FileResponse("build/index.html")

# Конфигурация
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "your_bot_token_here")
MIN_BET = 100
MAX_BET = 2000

# Инициализация Redis
redis_master = redis.Redis(**REDIS_CONFIG['master'])
redis_slave = redis.Redis(**REDIS_CONFIG['slave'])

# Throttling: хранить время последнего действия игрока
player_last_action = {}
THROTTLE_INTERVAL = 1.5  # секунды

class GameStateManager:
    def __init__(self, redis_master, redis_slave):
        self.redis_master = redis_master
        self.redis_slave = redis_slave
        self.games_key = "active_games"
        self.players_key = "player_balances"
        self.waiting_key = "waiting_players"
        self.player_games_key = "player_active_games"
        self._initialized = False
        
    async def initialize(self):
        """Асинхронная инициализация и проверка подключения к Redis"""
        if not self._initialized:
            try:
                await self.redis_master.ping()
                await self.redis_slave.ping()
                logger.info("Successfully connected to Redis master and slave")
                self._initialized = True
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise
            
    async def ensure_initialized(self):
        """Убедиться, что менеджер инициализирован перед использованием"""
        if not self._initialized:
            await self.initialize()
            
    async def add_waiting_player(self, player_id: str):
        """Добавление игрока в очередь ожидания в Redis master"""
        await self.ensure_initialized()
        try:
            # Проверяем подключение к Redis
            if not await self.redis_master.ping():
                logger.error("Redis master is not available")
                return False
                
            # Проверяем, не находится ли игрок уже в игре
            active_game = await self.get_player_active_game(player_id)
            if active_game:
                logger.warning(f"Player {player_id} is already in game {active_game}")
                return False
            
            # Добавляем игрока в очередь
            result = await self.redis_master.sadd(self.waiting_key, player_id)
            if result is None:
                logger.error("Failed to add player to waiting queue")
                return False
                
            logger.info(f"Added player {player_id} to waiting queue, result: {result}")
            return True
        except Exception as e:
            logger.error(f"Error adding player {player_id} to waiting queue: {e}")
            return False
    
    async def get_waiting_players(self) -> Set[str]:
        """Получение списка ожидающих игроков из Redis slave"""
        await self.ensure_initialized()
        try:
            players = await self.redis_slave.smembers(self.waiting_key)
            result = set(player.decode() for player in players)
            logger.debug(f"Retrieved waiting players: {result}")
            return result
        except Exception as e:
            logger.error(f"Error getting waiting players: {e}")
            raise
    
    async def remove_waiting_player(self, player_id: str):
        """Удаление игрока из очереди ожидания в Redis master"""
        await self.ensure_initialized()
        try:
            result = await self.redis_master.srem(self.waiting_key, player_id)
            logger.info(f"Removed player {player_id} from waiting queue, result: {result}")
            return result
        except Exception as e:
            logger.error(f"Error removing player {player_id} from waiting queue: {e}")
            raise
    
    async def save_game(self, game_id: str, game_state: GameState):
        """Сохранение состояния игры в Redis master"""
        await self.ensure_initialized()
        try:
            game_data = game_state.to_dict()
            await self.redis_master.hset(self.games_key, game_id, json.dumps(game_data))
            logger.info(f"Saved game {game_id} state")
            
            # Сохраняем связь игрок-игра для всех игроков
            for player_id in game_state.players:
                await self.redis_master.hset(self.player_games_key, player_id, game_id)
                logger.debug(f"Saved player {player_id} to game {game_id} mapping")
        except Exception as e:
            logger.error(f"Error saving game {game_id}: {e}")
            raise
    
    async def get_game(self, game_id: str) -> Optional[GameState]:
        """Получение состояния игры из Redis slave"""
        await self.ensure_initialized()
        try:
            game_data = await self.redis_slave.hget(self.games_key, game_id)
            if game_data:
                data = json.loads(game_data)
                game = GameState()
                game.from_dict(data)
                logger.debug(f"Retrieved game {game_id} state")
                return game
            logger.debug(f"Game {game_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting game {game_id}: {e}")
            raise
    
    async def get_player_balance(self, player_id: str) -> int:
        """Получение баланса игрока из Redis slave"""
        await self.ensure_initialized()
        try:
            balance = await self.redis_slave.hget(self.players_key, player_id)
            result = int(balance) if balance else 1000  # Начальный баланс
            logger.debug(f"Retrieved player {player_id} balance: {result}")
            return result
        except Exception as e:
            logger.error(f"Error getting player {player_id} balance: {e}")
            raise
    
    async def save_player_balance(self, player_id: str, balance: int):
        """Сохранение баланса игрока в Redis master"""
        await self.ensure_initialized()
        await self.redis_master.hset(self.players_key, player_id, str(balance))
    
    async def get_player_active_game(self, player_id: str) -> Optional[str]:
        """Получение ID активной игры игрока"""
        await self.ensure_initialized()
        game_id = await self.redis_slave.hget(self.player_games_key, player_id)
        if game_id:
            # Проверяем, существует ли еще игра
            game = await self.get_game(game_id.decode())
            if game:
                return game_id.decode()
            # Если игра не существует, удаляем связь
            await self.redis_master.hdel(self.player_games_key, player_id)
        return None
        
    async def remove_player_from_game(self, player_id: str, game_id: str):
        """Удаление игрока из игры"""
        await self.ensure_initialized()
        game = await self.get_game(game_id)
        if game and player_id in game.players:
            game.remove_player(player_id)
            if len(game.players) > 0:
                await self.save_game(game_id, game)
            else:
                # Если игра пуста, удаляем её
                await self.redis_master.hdel(self.games_key, game_id)
        await self.redis_master.hdel(self.player_games_key, player_id)
        
    async def cleanup_inactive_games(self):
        """Очистка неактивных игр"""
        await self.ensure_initialized()
        games = await self.redis_slave.hgetall(self.games_key)
        for game_id, game_data in games.items():
            game_id = game_id.decode()
            try:
                data = json.loads(game_data)
                if not data.get('players'):
                    await self.redis_master.hdel(self.games_key, game_id)
            except:
                # Если данные повреждены, удаляем игру
                await self.redis_master.hdel(self.games_key, game_id)

# Инициализация менеджера состояний
game_manager = GameStateManager(redis_master, redis_slave)

BOT_TOKEN = os.getenv("BOT_TOKEN")

def verify_telegram_data(init_data: str, bot_token: str = BOT_TOKEN) -> bool:
    """
    Проверяет подлинность строки initData из Telegram WebApp.
    """
    try:
        data = dict(parse_qsl(init_data, strict_parsing=True))
        received_hash = data.pop('hash', None)
        if not received_hash:
            return False

        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(
            key=bot_token.encode(),
            msg=b"WebAppData",
            digestmod=hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        return calculated_hash == received_hash
    except Exception:
        return False

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}  # player_id -> websocket
        self.player_games = {}  # player_id -> game_id
    
    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        logger.info(f"Player {player_id} connected")
    
    async def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
        if player_id in self.player_games:
            del self.player_games[player_id]
        logger.info(f"Player {player_id} disconnected")
    
    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in self.active_connections:
            try:
                await self.active_connections[player_id].send_json(message)
                logger.debug(f"Sent message to player {player_id}: {message}")
            except Exception as e:
                logger.error(f"Error sending message to player {player_id}: {e}")
    
    async def broadcast_to_game(self, message: dict, game_id: str):
        game = await game_manager.get_game(game_id)
        if game:
            for player_id in game.players:
                await self.send_personal_message(message, player_id)

manager = ConnectionManager()

# Добавляем функцию мониторинга состояния игры
async def monitor_game_state():
    """Мониторинг состояния игры и очереди"""
    while True:
        try:
            waiting_players = await game_manager.get_waiting_players()
            active_games = await game_manager.redis_slave.hgetall(game_manager.games_key)
            logger.info(f"Monitoring: {len(waiting_players)} waiting players, {len(active_games)} active games")
            
            # Проверяем состояние очереди
            for player_id in waiting_players:
                try:
                    active_game = await game_manager.get_player_active_game(player_id)
                    if active_game:
                        logger.warning(f"Player {player_id} is in queue but has active game {active_game}")
                        await game_manager.remove_waiting_player(player_id)
                except Exception as e:
                    logger.error(f"Error checking player {player_id} status: {e}")
            
            # Очищаем неактивные игры
            await game_manager.cleanup_inactive_games()
            
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
        await asyncio.sleep(5)

async def cleanup_waiting_queue():
    """Очистка очереди ожидания от неактивных игроков"""
    while True:
        try:
            waiting_players = await game_manager.get_waiting_players()
            for player_id in waiting_players:
                # Проверяем, активен ли WebSocket
                if player_id not in manager.active_connections:
                    await game_manager.remove_waiting_player(player_id)
                    logger.info(f"Removed inactive player {player_id} from waiting queue")
        except Exception as e:
            logger.error(f"Error in cleanup_waiting_queue: {e}")
        await asyncio.sleep(30)  # Проверяем каждые 30 секунд

# Запускаем мониторинг при старте приложения
@app.on_event("startup")
async def startup_event():
    """Запуск приложения и инициализация компонентов"""
    try:
        # Инициализируем GameStateManager
        await game_manager.initialize()
        
        # Запускаем мониторинг
        asyncio.create_task(monitor_game_state())
        logger.info("Game state monitoring started")
        
        # Запускаем очистку очереди
        asyncio.create_task(cleanup_waiting_queue())
        logger.info("Waiting queue cleanup started")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

# Улучшаем обработку WebSocket соединений
@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    try:
        logger.info(f"New WebSocket connection attempt for game {game_id}")
        
        # Проверяем валидность game_id
        if not game_id or game_id == "undefined":
            logger.error("Invalid game_id received")
            await websocket.close(code=4000)
            return
            
        await websocket.accept()
        logger.info("WebSocket connection accepted")

        # Ожидаем initData от клиента
        try:
            init_data = await websocket.receive_json()
            logger.debug(f"Received init data: {init_data}")
        except Exception as e:
            logger.error(f"Error receiving init data: {e}")
            await websocket.close(code=4000)
            return

        if not init_data.get('initData'):
            logger.error("No initData provided in WebSocket message")
            await websocket.close(code=4000)
            return

        # Валидация initData
        try:
            if not verify_telegram_data(init_data['initData'], BOT_TOKEN):
                logger.error("Invalid initData")
                await websocket.close(code=4001)
                return
        except Exception as e:
            logger.error(f"Error validating initData: {e}")
            await websocket.close(code=4001)
            return

        # Получаем player_id из initData
        try:
            params = dict(param.split('=') for param in init_data['initData'].split('&'))
            user_data = json.loads(params.get('user', '{}'))
            player_id = str(user_data.get('id'))
            
            if not player_id:
                logger.error("No player_id in initData")
                await websocket.close(code=4002)
                return
                
        except Exception as e:
            logger.error(f"Error parsing player_id: {e}")
            await websocket.close(code=4002)
            return
            
        # Подключаем игрока
        await manager.connect(websocket, player_id)
        logger.info(f"Player {player_id} connected to game {game_id}")
        
        try:
            while True:
                try:
                    data = await websocket.receive_json()
                    logger.debug(f"Received message from player {player_id}: {data}")
                    await handle_websocket_message(websocket, player_id, data)
                except WebSocketDisconnect:
                    logger.info(f"Player {player_id} disconnected")
                    break
                except Exception as e:
                    logger.error(f"Error handling message from player {player_id}: {e}")
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Произошла ошибка при обработке сообщения"
                    }, player_id)
        finally:
            await manager.disconnect(player_id)
            logger.info(f"Player {player_id} disconnected from game {game_id}")
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass

waiting_user_info = {}

async def handle_websocket_message(websocket: WebSocket, player_id: str, data: dict):
    message_type = data.get("type")
    logger.info(f"Handling message from player {player_id}: {data}")
    
    if message_type == "init":
        try:
            init_data = data.get("initData")
            if not init_data:
                logger.error("No initData in init message")
                return
                
            if not verify_telegram_data(init_data, BOT_TOKEN):
                logger.error("Invalid initData")
                await websocket.close(code=4001)
                return
                
            logger.info(f"Player {player_id} initialized successfully")
            await manager.send_personal_message({
                "type": "init_success"
            }, player_id)
        except Exception as e:
            logger.error(f"Error handling init message: {e}")
            await websocket.close(code=4000)
            return
    
    elif message_type == "find_game":
        try:
            # Проверяем баланс игрока
            balance = await game_manager.get_player_balance(player_id)
            logger.info(f"Player {player_id} balance: {balance}")
            
            if balance < MIN_BET:
                logger.warning(f"Player {player_id} has insufficient funds: {balance} < {MIN_BET}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Недостаточно средств для игры"
                }, player_id)
                return
            
            # Проверяем, не находится ли игрок уже в игре
            active_game = await game_manager.get_player_active_game(player_id)
            if active_game:
                logger.warning(f"Player {player_id} is already in game {active_game}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Вы уже находитесь в игре"
                }, player_id)
                return
            
            # Проверяем, не находится ли игрок уже в очереди
            waiting_players = await game_manager.get_waiting_players()
            logger.debug(f"Current waiting players before adding {player_id}: {waiting_players}")
            
            if player_id in waiting_players:
                logger.info(f"Player {player_id} is already in waiting queue")
                await manager.send_personal_message({
                    "type": "matchmaking_update",
                    "players_count": len(waiting_players),
                    "required_players": 6,
                    "min_bet": MIN_BET,
                    "max_bet": MAX_BET
                }, player_id)
                return
            
            # Сохраняем user_info если есть
            user_info = data.get('user')
            if user_info:
                waiting_user_info[player_id] = user_info
                logger.info(f"Saved user info for player {player_id}: {user_info}")
            
            # Добавляем игрока в очередь
            success = await game_manager.add_waiting_player(player_id)
            if not success:
                logger.error(f"Failed to add player {player_id} to waiting queue")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Не удалось добавить в очередь"
                }, player_id)
                return
                
            logger.info(f"Added player {player_id} to waiting queue")
            
            # Получаем обновленный список ожидающих игроков
            waiting_players = await game_manager.get_waiting_players()
            logger.info(f"Current waiting players after adding {player_id}: {waiting_players}")
            
            # Рассылаем всем ожидающим игрокам состояние лобби
            update_message = {
                "type": "matchmaking_update",
                "players_count": len(waiting_players),
                "required_players": 6,
                "min_bet": MIN_BET,
                "max_bet": MAX_BET,
                "waiting_players": list(waiting_players)  # Добавляем список игроков
            }
            logger.debug(f"Sending matchmaking update to all players: {update_message}")
            
            for pid in waiting_players:
                try:
                    await manager.send_personal_message(update_message, pid)
                    logger.debug(f"Sent matchmaking update to player {pid}")
                except Exception as e:
                    logger.error(f"Failed to send matchmaking update to player {pid}: {e}")
            
            # Если есть достаточно игроков, создаем игру
            if len(waiting_players) >= 6:
                try:
                    game_id = f"game_{int(time.time())}"
                    game = GameState()
                    logger.info(f"Creating new game {game_id}")
                    
                    # Добавляем игроков в игру с user_info
                    players_to_add = list(waiting_players)[:6]
                    logger.debug(f"Adding players to game {game_id}: {players_to_add}")
                    
                    for pid in players_to_add:
                        user_info = waiting_user_info.get(pid, {})
                        game.add_player(pid, user_info)
                        await game_manager.remove_waiting_player(pid)
                        manager.player_games[pid] = game_id
                        if pid in waiting_user_info:
                            del waiting_user_info[pid]
                    
                    # Сохраняем игру
                    await game_manager.save_game(game_id, game)
                    logger.info(f"Game {game_id} saved with players: {list(game.players.keys())}")
                    
                    # Уведомляем игроков о начале фазы ставок
                    betting_message = {
                        "type": "betting_phase",
                        "game_id": game_id,
                        "min_bet": MIN_BET,
                        "max_bet": MAX_BET,
                        "players": list(game.players.keys())
                    }
                    logger.debug(f"Sending betting phase message to players: {betting_message}")
                    
                    for pid in game.players:
                        try:
                            balance = await game_manager.get_player_balance(pid)
                            await manager.send_personal_message({
                                **betting_message,
                                "balance": balance
                            }, pid)
                            logger.debug(f"Sent betting phase message to player {pid}")
                        except Exception as e:
                            logger.error(f"Failed to send betting phase message to player {pid}: {e}")
                except Exception as e:
                    logger.error(f"Error creating game: {e}")
                    # Уведомляем игроков об ошибке
                    for pid in players_to_add:
                        try:
                            await manager.send_personal_message({
                                "type": "error",
                                "message": "Ошибка при создании игры"
                            }, pid)
                        except:
                            pass
        except Exception as e:
            logger.error(f"Error in find_game handler: {e}")
            await manager.send_personal_message({
                "type": "error",
                "message": "Произошла ошибка при поиске игры"
            }, player_id)
    
    elif message_type == "cancel_waiting":
        try:
            logger.info(f"Player {player_id} canceling waiting")
            # Удаляем игрока из очереди ожидания
            await game_manager.remove_waiting_player(player_id)
            if player_id in waiting_user_info:
                del waiting_user_info[player_id]
            
            # Получаем обновленный список ожидающих игроков
            waiting_players = await game_manager.get_waiting_players()
            logger.info(f"Remaining waiting players: {waiting_players}")
            
            # Уведомляем оставшихся игроков
            update_message = {
                "type": "matchmaking_update",
                "players_count": len(waiting_players),
                "required_players": 6,
                "min_bet": MIN_BET,
                "max_bet": MAX_BET
            }
            
            for pid in waiting_players:
                try:
                    await manager.send_personal_message(update_message, pid)
                except Exception as e:
                    logger.error(f"Failed to send update to player {pid}: {e}")
            
            # Отправляем подтверждение игроку
            await manager.send_personal_message({
                "type": "waiting_canceled",
                "message": "Поиск игры отменен"
            }, player_id)
            logger.info(f"Successfully canceled waiting for player {player_id}")
        except Exception as e:
            logger.error(f"Error canceling waiting for player {player_id}: {e}")
            await manager.send_personal_message({
                "type": "error",
                "message": "Ошибка при отмене поиска"
            }, player_id)
    
    elif message_type == "place_bet":
        game_id = manager.player_games.get(player_id)
        if not game_id:
            await manager.send_personal_message({
                "type": "error",
                "message": "Вы не находитесь в игре"
            }, player_id)
            return
            
        game = await game_manager.get_game(game_id)
        if not game:
            await manager.send_personal_message({
                "type": "error",
                "message": "Игра не найдена"
            }, player_id)
            return
            
        amount = data.get("amount", 0)
        if not game.place_initial_bet(player_id, amount):
            await manager.send_personal_message({
                "type": "error",
                "message": "Ошибка при размещении ставки"
            }, player_id)
            return
            
        # Сохраняем обновленное состояние игры
        await game_manager.save_game(game_id, game)
        
        # Уведомляем всех игроков о новой ставке
        for pid in game.players:
            await manager.send_personal_message({
                "type": "bet_placed",
                "player_id": player_id,
                "amount": amount,
                "ready_players": len(game.ready_players),
                "total_players": len(game.players)
            }, pid)
            
        # Если все сделали ставки, начинаем игру
        if game.status == 'playing':
            for pid in game.players:
                await manager.send_personal_message({
                    "type": "game_started",
                    "game_id": game_id,
                    "state": game.to_dict()
                }, pid)

# REST API endpoints

async def validate_telegram_init_data(request: Request) -> dict:
    """Получение и валидация данных инициализации Telegram WebApp"""
    try:
        init_data = request.headers.get("Telegram-Web-App-Init-Data")
        logger.info(f"Received initData: {init_data}")
        is_valid = verify_telegram_data(init_data, BOT_TOKEN)
        logger.info(f"Validation result: {is_valid}")
        if not init_data or not is_valid:
            logger.error("Invalid Telegram WebApp data")
            return JSONResponse(status_code=403, content={"error": "Invalid Telegram WebApp data"})
        
        logger.debug(f"Received init_data: {init_data}")
        
        # Парсим параметры
        params = {}
        for param in init_data.split('&'):
            if '=' not in param:
                continue
            key, value = param.split('=', 1)
            params[key] = unquote(value)
        
        logger.debug(f"Parsed parameters: {params}")
        
        # Получаем хеш
        received_hash = params.get('hash')
        if not received_hash:
            logger.error("No hash value in initData")
            raise HTTPException(status_code=400, detail="No hash value in initData")
        
        # Создаем копию параметров без hash
        check_params = params.copy()
        check_params.pop('hash', None)
        
        # Формируем строку для проверки
        data_check_arr = []
        for key in sorted(check_params.keys()):
            data_check_arr.append(f"{key}={check_params[key]}")
        data_check_string = '\n'.join(data_check_arr)
        
        logger.debug(f"Data check string: {data_check_string}")
        
        # Получаем токен бота
        bot_token = os.getenv("BOT_TOKEN", TELEGRAM_BOT_TOKEN)
        if not bot_token:
            logger.error("No bot token available")
            raise HTTPException(status_code=500, detail="Bot token not configured")
            
        logger.debug(f"Using bot token: {bot_token[:5]}...{bot_token[-5:]}")
        
        # Создаем секретный ключ
        secret = hmac.new(
            key=bot_token.encode(),
            msg=b"WebAppData",
            digestmod=hashlib.sha256
        ).digest()
        
        # Вычисляем хеш
        calculated_hash = hmac.new(
            key=secret,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        logger.debug(f"Calculated hash: {calculated_hash}")
        logger.debug(f"Received hash: {received_hash}")
        
        if calculated_hash != received_hash:
            logger.error(f"Hash mismatch: received {received_hash}, calculated {calculated_hash}")
            logger.error(f"Data used for hash calculation: {data_check_string}")
            raise HTTPException(status_code=401, detail="Invalid hash")
        
        # Получаем данные пользователя
        try:
            user_data = json.loads(params.get('user', '{}'))
            if not user_data.get('id'):
                raise HTTPException(status_code=400, detail="User ID not found in data")
            return user_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse user data: {e}")
            raise HTTPException(status_code=400, detail="Invalid user data format")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/game/create")
async def create_game(request: Request):
    try:
        user_data = await validate_telegram_init_data(request)
        user_id = str(user_data.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Проверяем баланс пользователя
        balance = await game_manager.get_player_balance(user_id)
        if balance < MIN_BET:
            raise HTTPException(
                status_code=400,
                detail={"error": "Insufficient funds", "balance": balance, "required": MIN_BET}
            )
            
        # Проверяем, не находится ли пользователь уже в игре
        active_game = await game_manager.get_player_active_game(user_id)
        if active_game:
            return {
                "status": "active_game_exists",
                "game_id": active_game,
                "message": "Player already in game"
            }
            
        # Добавляем игрока в очередь ожидания
        await game_manager.add_waiting_player(user_id)
        waiting_players = await game_manager.get_waiting_players()
        
        # Если достаточно игроков, создаем игру
        if len(waiting_players) >= 6:
            game_id = f"game_{int(time.time())}"
            game = GameState()
            game.add_players(list(waiting_players)[:6])
            await game_manager.save_game(game_id, game)
            
            # Очищаем очередь ожидания
            for player_id in game.players:
                await game_manager.remove_waiting_player(player_id)
                
            return {
                "status": "game_created",
                "game_id": game_id,
                "players": game.players
            }
        else:
            # Если недостаточно игроков, возвращаем статус ожидания
            return {
                "status": "waiting",
                "players_count": len(waiting_players),
                "required_players": 6
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/game/state")
async def get_game_state(request: Request):
    try:
        user_data = await validate_telegram_init_data(request)
        user_id = str(user_data.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Получаем активную игру пользователя
        game_id = await game_manager.get_player_active_game(user_id)
        if not game_id:
            return {"status": "no_active_game"}
            
        game = await game_manager.get_game(game_id)
        if not game:
            return {"status": "game_not_found"}
            
        return {
            "status": "active",
            "game_id": game_id,
            "state": game.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/game/status")
async def get_game_status(request: Request):
    try:
        user_data = await validate_telegram_init_data(request)
        user_id = str(user_data.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Проверяем, есть ли активная игра
        game_id = await game_manager.get_player_active_game(user_id)
        if game_id:
            game = await game_manager.get_game(game_id)
            if game:
                return {
                    "active": True,
                    "game_id": game_id,
                    "players_count": len(game.players)
                }
                
        # Проверяем, находится ли игрок в очереди ожидания
        waiting_players = await game_manager.get_waiting_players()
        if user_id in waiting_players:
            return {
                "active": False,
                "waiting": True,
                "players_count": len(waiting_players),
                "required_players": 6
            }
            
        return {
            "active": False,
            "waiting": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting game status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/game/cancel-waiting")
async def cancel_waiting(request: Request):
    try:
        user_data = await validate_telegram_init_data(request)
        user_id = str(user_data.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Удаляем игрока из очереди ожидания
        await game_manager.remove_waiting_player(user_id)
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling waiting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/balance")
async def get_user_balance(request: Request):
    """Получение баланса пользователя"""
    try:
        user_data = await validate_telegram_init_data(request)
        user_id = str(user_data.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Получаем баланс из Redis
        balance = await game_manager.get_player_balance(user_id)
        return {"balance": balance}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/logs")
async def handle_client_logs(
    request: Request,
    telegram_web_app_init_data: str = Header(None, alias="Telegram-Web-App-Init-Data")
):
    """Обработка логов от клиента"""
    try:
        # Проверяем данные Telegram
        if not telegram_web_app_init_data:
            raise HTTPException(status_code=400, detail="Missing Telegram WebApp init data")
            
        if not verify_telegram_data(telegram_web_app_init_data, BOT_TOKEN):
            raise HTTPException(status_code=401, detail="Invalid Telegram WebApp data")
        
        # Получаем логи из тела запроса
        logs_data = await request.json()
        logs = logs_data.get('logs', [])
        
        # Логируем каждое сообщение с соответствующим уровнем
        for log in logs:
            level = log.get('level', 'info')
            message = log.get('message', '')
            data = log.get('data')
            timestamp = log.get('timestamp')
            user_id = log.get('userId')
            
            log_message = f"[Client Log][{timestamp}][User: {user_id}] {message}"
            if data:
                log_message += f"\nData: {json.dumps(data, indent=2)}"
            
            if level == 'debug':
                logger.debug(log_message)
            elif level == 'info':
                logger.info(log_message)
            elif level == 'warn':
                logger.warning(log_message)
            elif level == 'error':
                logger.error(log_message)
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error handling client logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Добавляем middleware для логирования всех запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"Request: {request.method} {request.url}")
    logger.debug(f"Headers: {request.headers}")
    response = await call_next(request)
    logger.debug(f"Response status: {response.status_code}")
    return response

@app.post("/api/validate-init-data")
async def validate_init_data(request: Request):
    """Валидация данных инициализации Telegram WebApp"""
    try:
        user_data = await validate_telegram_init_data(request)
        return JSONResponse(
            status_code=200,
            content={
                "valid": True,
                "user": user_data
            }
        )
    except HTTPException as e:
        logger.error(f"Validation failed: {e.detail}")
        return JSONResponse(
            status_code=e.status_code,
            content={
                "valid": False,
                "error": str(e.detail)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in validate_init_data: {str(e)}")
        logger.exception(e)
        return JSONResponse(
            status_code=500,
            content={
                "valid": False,
                "error": "Internal server error"
            }
        )

if __name__ == "__main__":
    import uvicorn
    # Получаем порт из переменной окружения или используем 8000 по умолчанию
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)