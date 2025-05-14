import os
import random
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import redis
import uuid
from enum import Enum

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

class GameModel(Base):
    __tablename__ = "games"
    id = Column(String, primary_key=True, index=True)
    players = Column(JSON)
    deck = Column(JSON)
    table = Column(JSON)
    pot = Column(Integer)
    status = Column(String)

# ====================== PYDANTIC СХЕМЫ ======================
class PlayerAction(BaseModel):
    player_id: str
    action: str  # "bet", "fold", "svara"
    amount: Optional[int] = None

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
        self.table = []
        self.pot = 0
        self.current_bet = 0
        self.status = GameStatus.WAITING

    def _generate_deck(self) -> List[str]:
        ranks = ['A', 'K', 'Q', '10']
        suits = ['♠', '♥', '♦', '♣']
        deck = [f"{r}{s}" for s in suits for r in ranks]
        return deck + [self.joker]

    def _deal_hand(self) -> List[str]:
        return [self.deck.pop() for _ in range(3)]

    def calculate_scores(self):
        for pid, data in self.players.items():
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

            self.players[pid]["score"] = max_score

    def place_bet(self, player_id: str, amount: int) -> bool:
        if self.players[player_id]["balance"] >= amount:
            self.players[player_id]["balance"] -= amount
            self.pot += amount
            self.current_bet = amount
            return True
        return False

    def handle_svara(self, players: List[str]) -> bool:
        if all(self.players[pid]["balance"] >= self.pot // 2 for pid in players):
            for pid in players:
                self.players[pid]["balance"] -= self.pot // 2
            self.pot *= 2
            return True
        return False

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

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(websocket, game_id)
    game = active_games.get(game_id)

    try:
        while True:
            data = await websocket.receive_json()
            action = PlayerAction(**data)

            if action.action == "bet":
                if game.place_bet(action.player_id, action.amount):
                    await manager.broadcast(game_id, {
                        "event": "bet",
                        "player": action.player_id,
                        "amount": action.amount,
                        "pot": game.pot
                    })

            elif action.action == "fold":
                game.players[action.player_id]["folded"] = True
                await manager.broadcast(game_id, {
                    "event": "fold",
                    "player": action.player_id
                })

            elif action.action == "svara":
                if game.handle_svara([action.player_id]):
                    await manager.broadcast(game_id, {
                        "event": "svara",
                        "players": [action.player_id],
                        "pot": game.pot
                    })

    except WebSocketDisconnect:
        del manager.active_connections[game_id]

@app.post("/create_game")
async def create_game(player_ids: List[str]):
    game_id = str(uuid.uuid4())
    active_games[game_id] = SekaGame(player_ids)
    
    db = SessionLocal()
    db.add(GameModel(
        id=game_id,
        players=active_games[game_id].players,
        deck=active_games[game_id].deck,
        table=[],
        pot=0,
        status=GameStatus.WAITING.value
    ))
    db.commit()
    
    return {"game_id": game_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
