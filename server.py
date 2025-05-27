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
    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        active_connections[player_id] = websocket
        
        # Инициализация баланса для нового игрока
        if player_id not in player_balances:
            player_balances[player_id] = 1000  # Начальный баланс
        
    async def disconnect(self, player_id: str):
        if player_id in active_connections:
            del active_connections[player_id]
        if player_id in waiting_players:
            waiting_players.remove(player_id)
            
    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in active_connections:
            await active_connections[player_id].send_json(message)
            
    async def broadcast_to_game(self, message: dict, game_id: str):
        game = active_games.get(game_id)
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

async def handle_websocket_message(websocket: WebSocket, player_id: str, data: dict):
    message_type = data.get("type")
    
    if message_type == "find_game":
        # Проверяем баланс игрока
        balance = await game_manager.get_player_balance(player_id)
        if balance < MIN_BET:
            await manager.send_personal_message({
                "type": "error",
                "message": "Недостаточно средств для игры"
            }, player_id)
            return
            
        # Добавляем игрока в очередь
        await game_manager.add_waiting_player(player_id)
        
        # Если есть достаточно игроков, создаем игру
        waiting_players = await game_manager.get_waiting_players()
        if len(waiting_players) >= 6:
            game_id = f"game_{int(time.time())}"
            game = GameState()
            
            # Добавляем игроков в игру
            for pid in list(waiting_players)[:6]:
                game.add_player(pid)
                await game_manager.remove_waiting_player(pid)
            
            # Раздаем карты
            game.deal_cards()
            
            # Сохраняем игру
            await game_manager.save_game(game_id, game)
            
            # Уведомляем игроков
            for pid in game.players:
                await manager.send_personal_message({
                    "type": "game_state",
                    "state": game.to_dict(),
                    "balance": await game_manager.get_player_balance(pid)
                }, pid)
    
    elif message_type == "game_action":
        game_id = data.get("game_id")
        action = data.get("action")
        
        if not game_id or not action:
            await manager.send_personal_message({
                "type": "error",
                "message": "Invalid game action"
            }, player_id)
            return
            
        game = active_games.get(game_id)
        if not game:
            await manager.send_personal_message({
                "type": "error",
                "message": "Game not found"
            }, player_id)
            return
            
        if action == "bet":
            amount = data.get("amount", 0)
            
            # Проверяем баланс
            if amount > player_balances[player_id]:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Недостаточно средств"
                }, player_id)
                return
                
            if game.place_bet(player_id, amount):
                # Списываем ставку
                player_balances[player_id] -= amount
                
                await manager.broadcast_to_game({
                    "type": "game_state",
                    "state": game.to_dict(),
                    "balance": player_balances[player_id]
                }, game_id)
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid bet amount"
                }, player_id)
                
        elif action == "fold":
            game.fold(player_id)
            await manager.broadcast_to_game({
                "type": "game_state",
                "state": game.to_dict()
            }, game_id)
            
            # Проверяем, остался ли один игрок
            active_players = [pid for pid in game.players if pid not in game.folded_players]
            if len(active_players) == 1:
                winner = active_players[0]
                # Начисляем выигрыш
                player_balances[winner] += game.bank
                
                await manager.broadcast_to_game({
                    "type": "game_over",
                    "winner": winner,
                    "state": game.to_dict(),
                    "balance": player_balances[winner]
                }, game_id)
                del active_games[game_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)