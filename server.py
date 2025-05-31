import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from game.engine import GameState
from typing import Dict, Set, Optional
import hashlib
import hmac
import json
import os
from datetime import datetime
import redis
import time
from config import REDIS_CONFIG
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/pages", StaticFiles(directory="pages"), name="pages")

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
    
    async def save_game(self, game_id: str, game_state: GameState):
        """Сохранение состояния игры в Redis master"""
        game_data = game_state.to_dict()
        await self.redis_master.hset(self.games_key, game_id, json.dumps(game_data))
        # Сохраняем связь игрок-игра для всех игроков
        for player_id in game_state.players:
            await self.redis_master.hset(self.player_games_key, player_id, game_id)
    
    async def get_game(self, game_id: str) -> Optional[GameState]:
        """Получение состояния игры из Redis slave"""
        game_data = await self.redis_slave.hget(self.games_key, game_id)
        if game_data:
            data = json.loads(game_data)
            game = GameState()
            game.from_dict(data)
            return game
        return None
    
    async def save_player_balance(self, player_id: str, balance: int):
        """Сохранение баланса игрока в Redis master"""
        await self.redis_master.hset(self.players_key, player_id, str(balance))
    
    async def get_player_balance(self, player_id: str) -> int:
        """Получение баланса игрока из Redis slave"""
        balance = await self.redis_slave.hget(self.players_key, player_id)
        return int(balance) if balance else 1000  # Начальный баланс
    
    async def add_waiting_player(self, player_id: str):
        """Добавление игрока в очередь ожидания в Redis master"""
        await self.redis_master.sadd(self.waiting_key, player_id)
    
    async def remove_waiting_player(self, player_id: str):
        """Удаление игрока из очереди ожидания в Redis master"""
        await self.redis_master.srem(self.waiting_key, player_id)
    
    async def get_waiting_players(self) -> Set[str]:
        """Получение списка ожидающих игроков из Redis slave"""
        players = await self.redis_slave.smembers(self.waiting_key)
        return set(player.decode() for player in players)
        
    async def get_player_active_game(self, player_id: str) -> Optional[str]:
        """Получение ID активной игры игрока"""
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

def verify_telegram_data(init_data: str, hash: str) -> bool:
    """Проверка подлинности данных от Telegram"""
    secret_key = hmac.new(
        "WebAppData".encode(),
        TELEGRAM_BOT_TOKEN.encode(),
        hashlib.sha256
    ).digest()
    
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(
            json.loads(init_data).items(),
            key=lambda x: x[0]
        )
    )
    
    hmac_obj = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    )
    
    return hmac_obj.hexdigest() == hash

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

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    try:
        # Получаем и проверяем initData из query параметров
        init_data = websocket.query_params.get("initData")
        if not init_data:
            await websocket.close(code=4001)
            return
            
        # Проверяем валидность данных
        try:
            data = json.loads(init_data)
            if not verify_telegram_data(init_data, data.get('hash', '')):
                await websocket.close(code=4001)
                return
        except Exception as e:
            logger.error(f"Invalid init data: {e}")
            await websocket.close(code=4001)
            return

        await manager.connect(websocket, player_id)
        
        try:
            while True:
                data = await websocket.receive_json()
                now = time.time()
                if player_id in player_last_action and now - player_last_action[player_id] < THROTTLE_INTERVAL:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Слишком часто! Подождите немного."
                    }, player_id)
                    continue
                player_last_action[player_id] = now
                
                await handle_websocket_message(websocket, player_id, data)
        except WebSocketDisconnect:
            await manager.disconnect(player_id)
            logger.info(f"Player {player_id} disconnected")
        except Exception as e:
            logger.error(f"Error in websocket connection: {e}")
            await manager.disconnect(player_id)
    except Exception as e:
        logger.error(f"Error in websocket endpoint: {e}")
        try:
            await websocket.close(code=4000)
        except:
            pass

waiting_user_info = {}

async def handle_websocket_message(websocket: WebSocket, player_id: str, data: dict):
    message_type = data.get("type")
    logger.info(f"Received message from player {player_id}: {data}")
    
    if message_type == "find_game":
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
        
        # Сохраняем user_info если есть
        user_info = data.get('user')
        if user_info:
            waiting_user_info[player_id] = user_info
        
        # Добавляем игрока в очередь
        await game_manager.add_waiting_player(player_id)
        logger.info(f"Added player {player_id} to waiting queue")
        
        # Получаем всех ожидающих игроков
        waiting_players = await game_manager.get_waiting_players()
        logger.info(f"Current waiting players: {waiting_players}")
        
        # Рассылаем всем ожидающим игрокам состояние лобби
        for pid in waiting_players:
            await manager.send_personal_message({
                "type": "matchmaking_update",
                "players_count": len(waiting_players),
                "required_players": 6
            }, pid)
        
        # Если есть достаточно игроков, создаем игру
        if len(waiting_players) >= 6:
            game_id = f"game_{int(time.time())}"
            game = GameState()
            logger.info(f"Creating new game {game_id}")
            
            # Добавляем игроков в игру с user_info
            for pid in list(waiting_players)[:6]:
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
            for pid in game.players:
                balance = await game_manager.get_player_balance(pid)
                await manager.send_personal_message({
                    "type": "betting_phase",
                    "game_id": game_id,
                    "min_bet": MIN_BET,
                    "max_bet": MAX_BET,
                    "balance": balance
                }, pid)
    
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

async def get_telegram_init_data(telegram_web_app_init_data: str = Header(None, alias="Telegram-Web-App-Init-Data")):
    """Получение и валидация данных инициализации Telegram WebApp"""
    if not telegram_web_app_init_data:
        raise HTTPException(status_code=400, detail="Missing Telegram WebApp init data")
        
    try:
        # Парсим данные
        data = json.loads(telegram_web_app_init_data)
        
        # Проверяем наличие необходимых полей
        if not data.get('user'):
            raise HTTPException(status_code=400, detail="User data not found in init data")
            
        # Проверяем подпись данных
        if not verify_telegram_data(telegram_web_app_init_data, data.get('hash', '')):
            raise HTTPException(status_code=401, detail="Invalid Telegram WebApp data")
            
        return telegram_web_app_init_data
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in init data")
    except Exception as e:
        logger.error(f"Error validating Telegram init data: {e}")
        raise HTTPException(status_code=500, detail="Error validating Telegram data")

@app.post("/api/validate-init-data")
async def validate_init_data(init_data: str = Depends(get_telegram_init_data)):
    """Валидация данных инициализации Telegram WebApp"""
    try:
        # Если мы дошли до этой точки, значит валидация прошла успешно
        return {"valid": True}
    except Exception as e:
        logger.error(f"Init data validation error: {e}")
        return {"valid": False}

@app.post("/api/game/create")
async def create_game(init_data: str = Depends(get_telegram_init_data)):
    try:
        # Получаем данные пользователя из init_data
        data = json.loads(init_data)
        user = data.get('user', {})
        user_id = str(user.get('id'))
        
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
            
    except Exception as e:
        logger.error(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/game/state")
async def get_game_state(init_data: str = Depends(get_telegram_init_data)):
    try:
        # Получаем данные пользователя из init_data
        data = json.loads(init_data)
        user = data.get('user', {})
        user_id = str(user.get('id'))
        
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
        
    except Exception as e:
        logger.error(f"Error getting game state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/game/status")
async def get_game_status(init_data: str = Depends(get_telegram_init_data)):
    try:
        # Получаем данные пользователя из init_data
        data = json.loads(init_data)
        user = data.get('user', {})
        user_id = str(user.get('id'))
        
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
        
    except Exception as e:
        logger.error(f"Error getting game status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/game/cancel-waiting")
async def cancel_waiting(init_data: str = Depends(get_telegram_init_data)):
    try:
        # Получаем данные пользователя из init_data
        data = json.loads(init_data)
        user = data.get('user', {})
        user_id = str(user.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Удаляем игрока из очереди ожидания
        await game_manager.remove_waiting_player(user_id)
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error canceling waiting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/balance")
async def get_user_balance(init_data: str = Depends(get_telegram_init_data)):
    """Получение баланса пользователя"""
    try:
        # Получаем данные пользователя из init_data
        data = json.loads(init_data)
        user = data.get('user', {})
        user_id = str(user.get('id'))
        
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
            
        # Получаем баланс из Redis
        balance = await game_manager.get_player_balance(user_id)
        return {"balance": balance}
        
    except Exception as e:
        logger.error(f"Error getting user balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Получаем порт из переменной окружения или используем 8000 по умолчанию
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)