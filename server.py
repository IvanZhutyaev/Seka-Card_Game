import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
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

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

class GameStateManager:
    def __init__(self, redis_master, redis_slave):
        self.redis_master = redis_master
        self.redis_slave = redis_slave
        self.games_key = "active_games"
        self.players_key = "player_balances"
        self.waiting_key = "waiting_players"
    
    async def save_game(self, game_id: str, game_state: GameState):
        """Сохранение состояния игры в Redis master"""
        game_data = game_state.to_dict()
        await self.redis_master.hset(self.games_key, game_id, json.dumps(game_data))
    
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
        return set(await self.redis_slave.smembers(self.waiting_key))

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
    # Проверка подлинности данных от Telegram
    init_data = websocket.query_params.get("initData", "")
    hash = websocket.query_params.get("hash", "")
    
    if not verify_telegram_data(init_data, hash):
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, player_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            await handle_websocket_message(websocket, player_id, data)
    except WebSocketDisconnect:
        await manager.disconnect(player_id)
        logger.info(f"Player {player_id} disconnected")

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
                "type": "lobby_state",
                "players_in_lobby": len(waiting_players)
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
            
            # Раздаем карты
            game.deal_cards()
            logger.info(f"Cards dealt in game {game_id}. Game state: {game.to_dict()}")
            
            # Сохраняем игру
            await game_manager.save_game(game_id, game)
            logger.info(f"Game {game_id} saved with players: {list(game.players.keys())}")
            
            # Уведомляем игроков
            for pid in game.players:
                balance = await game_manager.get_player_balance(pid)
                logger.info(f"Sending game state to player {pid}. Balance: {balance}")
                await manager.send_personal_message({
                    "type": "game_state",
                    "game_id": game_id,
                    "state": game.to_dict(),
                    "balance": balance
                }, pid)
    
    elif message_type == "game_action":
        game_id = data.get("game_id")
        action = data.get("action")
        logger.info(f"Processing game action from player {player_id} in game {game_id}: {action}")
        
        # Получаем состояние игры
        game = await game_manager.get_game(game_id)
        if not game:
            logger.error(f"Game {game_id} not found")
            await manager.send_personal_message({
                "type": "error",
                "message": "Игра не найдена"
            }, player_id)
            return
        
        logger.info(f"Current game state for {game_id}: {game.to_dict()}")
        
        if action == "bet":
            amount = data.get("amount", 0)
            logger.info(f"Player {player_id} attempting to bet {amount} in game {game_id}")
            
            # Проверяем баланс
            player_balance = await game_manager.get_player_balance(player_id)
            logger.info(f"Player {player_id} current balance: {player_balance}")
            
            if amount > player_balance:
                logger.warning(f"Player {player_id} has insufficient funds for bet: {amount} > {player_balance}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Недостаточно средств"
                }, player_id)
                return
            
            if game.place_bet(player_id, amount):
                # Списываем ставку
                await game_manager.save_player_balance(player_id, player_balance - amount)
                logger.info(f"Bet placed successfully. New balance: {player_balance - amount}")
                
                # Сохраняем обновленное состояние игры
                await game_manager.save_game(game_id, game)
                logger.info(f"Updated game state saved: {game.to_dict()}")
                
                # Отправляем обновленное состояние всем игрокам
                for pid in game.players:
                    balance = await game_manager.get_player_balance(pid)
                    logger.info(f"Sending updated state to player {pid}. Balance: {balance}")
                    await manager.send_personal_message({
                        "type": "game_state",
                        "game_id": game_id,
                        "state": game.to_dict(),
                        "balance": balance
                    }, pid)
            else:
                logger.warning(f"Failed to place bet for player {player_id} in game {game_id}")
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Не удалось сделать ставку"
                }, player_id)

if __name__ == "__main__":
    import uvicorn
    # Получаем порт из переменной окружения или используем 8000 по умолчанию
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)