import os
import random
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import redis

# ====================== НАСТРОЙКИ ======================
class Settings(BaseModel):
    POSTGRES_DB: str = "seka"
    POSTGRES_USER: str = "seka_user"
    POSTGRES_PASSWORD: str = "your_password"
    POSTGRES_HOST: str = "localhost"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

settings = Settings()

# ====================== ПОДКЛЮЧЕНИЕ К БАЗАМ ДАННЫХ ======================
# PostgreSQL connection
def get_db_connection():
    conn = psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST
    )
    return conn

# Redis connection
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True
)

# ====================== МОДЕЛИ ДАННЫХ ======================
class GameStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    FINISHED = "finished"

class TransactionType(str, Enum):
    BET = "bet"
    WIN = "win"
    LOSS = "loss"
    FOLD = "fold"
    SVARA = "svara"
    JOIN = "join"

class Player(BaseModel):
    id: str
    username: Optional[str]
    balance: int = 1000

# ====================== МЕТОДЫ ДЛЯ РАБОТЫ С POSTGRESQL ======================
def create_game_in_db(game_id: str, players: List[str]):
    """Создаем новую игру в базе данных"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Добавляем игру
        cur.execute(
            "INSERT INTO games (id, status, deck, table_cards, pot) "
            "VALUES (%s, %s, %s, %s, %s)",
            (game_id, GameStatus.WAITING.value, json.dumps([]), json.dumps([]), 0)
        )
        
        # Добавляем игроков
        for player_id in players:
            # Проверяем существует ли игрок
            cur.execute(
                "INSERT INTO players (id, balance) "
                "VALUES (%s, %s) "
                "ON CONFLICT (id) DO NOTHING",
                (player_id, 1000)
            )
            
            # Добавляем связь игрока с игрой
            cur.execute(
                "INSERT INTO game_players (game_id, player_id, cards, bet, folded) "
                "VALUES (%s, %s, %s, %s, %s)",
                (game_id, player_id, json.dumps([]), 0, False)
            )
        
        conn.commit()
    finally:
        cur.close()
        conn.close()

def record_transaction(game_id: str, player_id: str, amount: int, action: TransactionType):
    """Записываем транзакцию в базу данных"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO transactions (game_id, player_id, amount, action) "
            "VALUES (%s, %s, %s, %s)",
            (game_id, player_id, amount, action.value)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

# ====================== МЕТОДЫ ДЛЯ РАБОТЫ С REDIS ======================
def set_player_online(player_id: str):
    """Устанавливаем статус онлайн для игрока"""
    redis_client.set(f"player:{player_id}:online", "true", ex=300)  # TTL 5 минут

def add_player_to_queue(player_id: str):
    """Добавляем игрока в очередь"""
    redis_client.lpush("seka:queue", player_id)
    set_player_online(player_id)

def get_players_in_queue(count: int = 2) -> List[str]:
    """Получаем игроков из очереди для создания игры"""
    players = []
    for _ in range(count):
        player_id = redis_client.rpop("seka:queue")
        if player_id:
            players.append(player_id)
    return players

# ====================== ИГРОВАЯ ЛОГИКА ======================
class SekaGame:
    def __init__(self, player_ids: List[str]):
        self.game_id = str(uuid.uuid4())
        self.player_ids = player_ids
        self.status = GameStatus.WAITING
        
        # Инициализируем игру в базах данных
        create_game_in_db(self.game_id, player_ids)
        for player_id in player_ids:
            set_player_online(player_id)
            record_transaction(self.game_id, player_id, 0, TransactionType.JOIN)

    def start_game(self):
        """Начинаем игру, раздаем карты"""
        self.status = GameStatus.ACTIVE
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Генерируем колоду (4xA, K, Q, 10 + джокер 9♣)
            deck = [f"{rank}{suit}" for suit in ["♠", "♥", "♦", "♣"] 
                    for rank in ["A", "K", "Q", "10"]] + ["9♣"]
            random.shuffle(deck)
            
            # Раздаем по 3 карты каждому игроку
            for player_id in self.player_ids:
                cards = [deck.pop() for _ in range(3)]
                cur.execute(
                    "UPDATE game_players SET cards = %s "
                    "WHERE game_id = %s AND player_id = %s",
                    (json.dumps(cards), self.game_id, player_id)
                )
            
            # Сохраняем оставшуюся колоду
            cur.execute(
                "UPDATE games SET deck = %s, status = %s "
                "WHERE id = %s",
                (json.dumps(deck), GameStatus.ACTIVE.value, self.game_id)
            )
            
            conn.commit()
        finally:
            cur.close()
            conn.close()

# ====================== FASTAPI ПРИЛОЖЕНИЕ ======================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/create_game")
async def create_game():
    """Создаем новую игру с игроками из очереди"""
    players = get_players_in_queue(2)  # Берем 2 игроков из очереди
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Not enough players in queue")
    
    game = SekaGame(players)
    game.start_game()
    
    return {"game_id": game.game_id, "players": players}

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    """WebSocket подключение для игрока"""
    await websocket.accept()
    set_player_online(player_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Обработка действий игрока
            if data["action"] == "join_queue":
                add_player_to_queue(player_id)
                await websocket.send_json({"status": "added_to_queue"})
                
    except WebSocketDisconnect:
        # При отключении игрока
        redis_client.set(f"player:{player_id}:online", "false")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
