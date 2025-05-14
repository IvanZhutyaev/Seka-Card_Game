import os
import random
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Union

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis
from sqlalchemy import create_engine, Column, String, Integer, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ====================== КОНФИГУРАЦИЯ ======================
class Settings(BaseModel):
    POSTGRES_URL: str = "postgresql://user:pass@localhost:5432/seka"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "secret"

settings = Settings()

# ====================== БАЗЫ ДАННЫХ ======================
Base = declarative_base()
engine = create_engine(settings.POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

# ====================== МОДЕЛИ ======================
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

class GameModel(Base):
    __tablename__ = "games"
    id = Column(String(36), primary_key=True, index=True)
    players = Column(JSON)
    deck = Column(JSON)
    table_cards = Column(JSON)
    pot = Column(Integer, default=0)
    status = Column(String(20), default=GameStatus.WAITING)
    created_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)

class PlayerStats(BaseModel):
    games_played: int = 0
    games_won: int = 0
    total_profit: int = 0
    max_win: int = 0
    last_activity: Optional[datetime] = None

# ====================== PYDANTIC СХЕМЫ ======================
class PlayerAction(BaseModel):
    player_id: str
    action: TransactionType
    amount: Optional[int] = None
    card: Optional[str] = None

class PlayerInfo(BaseModel):
    id: str
    username: Optional[str]
    balance: int = Field(default=1000, ge=0)
    online: bool = False

# ====================== ЛОГИКА ИГРЫ ======================
class SekaGame:
    def __init__(self, player_ids: List[str]):
        self.joker = "9♣"
        self.deck = self._generate_deck()
        random.shuffle(self.deck)
        self.players = {
            pid: {
                "cards": self._deal_hand(),
                "balance": 1000,
                "folded": False,
                "score": 0
            } for pid in player_ids
        }
        self.table_cards = []
        self.pot = 0
        self.current_bet = 0
        self.status = GameStatus.WAITING
        self._update_redis_status()
        
        # Добавляем игроков в очередь
        for player_id in player_ids:
            self._add_to_queue(player_id)
            self.record_transaction(player_id, 0, TransactionType.JOIN)

    def _generate_deck(self) -> List[str]:
        ranks = ['A', 'K', 'Q', '10']
        suits = ['♠', '♥', '♦', '♣']
        deck = [f"{r}{s}" for s in suits for r in ranks]
        return deck + [self.joker]

    def _deal_hand(self) -> List[str]:
        return [self.deck.pop() for _ in range(3)]

    def _update_redis_status(self):
        """Обновляем статус игры в Redis"""
        redis_client.hset(
            f"seka:game:{id(self)}:status",
            mapping={
                "pot": self.pot,
                "status": self.status,
                "players": json.dumps(list(self.players.keys()))
            }
        )

    def _add_to_queue(self, player_id: str):
        """Добавляем игрока в очередь"""
        redis_client.lpush('seka:queue', player_id)
        redis_client.set(f"seka:player:{player_id}:online", "true", ex=300)

    def _remove_from_queue(self, player_id: str):
        """Удаляем игрока из очереди"""
        redis_client.lrem('seka:queue', 0, player_id)
        redis_client.delete(f"seka:player:{player_id}:online")

    def record_transaction(self, player_id: str, amount: int, action: TransactionType):
        """Записываем транзакцию"""
        transaction = {
            "player_id": player_id,
            "amount": amount,
            "action": action.value,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Сохраняем в Redis
        redis_client.lpush(f"seka:player:{player_id}:transactions", json.dumps(transaction))
        
        # Сохраняем в PostgreSQL (через сессию)
        db = SessionLocal()
        try:
            db.execute(
                "INSERT INTO transactions (game_id, player_id, amount, action) "
                "VALUES (:game_id, :player_id, :amount, :action)",
                {
                    "game_id": id(self),
                    "player_id": player_id,
                    "amount": amount,
                    "action": action.value
                }
            )
            db.commit()
        finally:
            db.close()

    def update_stats(self, player_id: str, result: str):
        """Обновляем статистику игрока"""
        stats_data = redis_client.get(f"seka:player:{player_id}:stats")
        stats = PlayerStats(**json.loads(stats_data)) if stats_data else PlayerStats()
        
        stats.games_played += 1
        if result == "win":
            stats.games_won += 1
            stats.total_profit += self.pot
            stats.max_win = max(stats.max_win, self.pot)
        
        redis_client.set(f"seka:player:{player_id}:stats", json.dumps(stats.dict()))

    def calculate_scores(self):
        """Подсчёт очков для всех игроков"""
        for player_id, data in self.players.items():
            if data["folded"]:
                continue
                
            cards = data["cards"]
            suits = {}
            for card in cards:
                suit = card[-1]
                rank = card[:-1]
                suits.setdefault(suit, []).append(rank)

            max_score = 0
            for suit, ranks in suits.items():
                score = sum(
                    11 if (rank == "A" or card == self.joker) else 10
                    for card in ranks
                )
                max_score = max(max_score, score)

            # Проверка на "Два лба" (2 туза)
            aces = sum(1 for card in cards if card[:-1] == "A")
            if aces >= 2:
                max_score = max(max_score, 22)

            self.players[player_id]["score"] = max_score

# ====================== WEB SERVER ======================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        self.active_connections[game_id] = websocket

    async def broadcast(self, game_id: str, message: dict):
        if game_id in self.active_connections:
            await self.active_connections[game_id].send_json(message)

manager = ConnectionManager()
active_games: Dict[str, SekaGame] = {}

@app.post("/create_game")
async def create_game(player_ids: List[str]):
    game_id = str(uuid.uuid4())
    active_games[game_id] = SekaGame(player_ids)
    
    # Сохраняем в PostgreSQL
    db = SessionLocal()
    try:
        game = GameModel(
            id=game_id,
            players=active_games[game_id].players,
            deck=active_games[game_id].deck,
            table_cards=[],
            pot=0,
            status=GameStatus.WAITING.value
        )
        db.add(game)
        db.commit()
    finally:
        db.close()
    
    return {"game_id": game_id}

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(websocket, game_id)
    game = active_games.get(game_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            action = PlayerAction(**data)
            
            if action.action == TransactionType.BET:
                if game.place_bet(action.player_id, action.amount):
                    game.record_transaction(action.player_id, action.amount, TransactionType.BET)
                    await manager.broadcast(game_id, {
                        "event": "bet",
                        "player": action.player_id,
                        "amount": action.amount,
                        "pot": game.pot
                    })
            
            elif action.action == TransactionType.FOLD:
                game.players[action.player_id]["folded"] = True
                game.record_transaction(action.player_id, 0, TransactionType.FOLD)
                await manager.broadcast(game_id, {
                    "event": "fold",
                    "player": action.player_id
                })
                
    except WebSocketDisconnect:
        manager.disconnect(game_id)
        if game:
            for player_id in game.players:
                redis_client.set(f"seka:player:{player_id}:online", "false")

@app.get("/player/{player_id}/stats")
async def get_player_stats(player_id: str):
    stats_data = redis_client.get(f"seka:player:{player_id}:stats")
    if not stats_data:
        raise HTTPException(status_code=404, detail="Player not found")
    return json.loads(stats_data)

@app.get("/player/{player_id}/transactions")
async def get_player_transactions(player_id: str, limit: int = 10):
    transactions = redis_client.lrange(f"seka:player:{player_id}:transactions", 0, limit-1)
    return [json.loads(t) for t in transactions]

@app.get("/queue/status")
async def get_queue_status():
    return {
        "count": redis_client.llen("seka:queue"),
        "players": redis_client.lrange("seka:queue", 0, -1)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
