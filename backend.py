import os
import random
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, BaseSettings
from sqlalchemy import create_engine, Column, String, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import redis
import uuid
from enum import Enum


# ====================== КОНФИГУРАЦИЯ ======================
class Settings(BaseSettings):
    POSTGRES_URL: str = "postgresql://user:pass@localhost:5432/seka"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "secret"

    class Config:
        env_file = ".env"


settings = Settings()

# ====================== БАЗЫ ДАННЫХ ======================
# PostgreSQL (SQLAlchemy)
Base = declarative_base()
engine = create_engine(settings.POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


# ====================== МОДЕЛИ ======================
class GameStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    FINISHED = "finished"


class GameModel(Base):
    """Модель игровой сессии в PostgreSQL"""
    __tablename__ = "games"

    id = Column(String, primary_key=True, index=True)
    players = Column(JSON)  # {player_id: {"cards": [], "balance": 1000}}
    deck = Column(JSON)  # ["A♠", "K♥", ...]
    table = Column(JSON)  # Карты на столе
    pot = Column(Integer)  # Общий банк
    status = Column(String)  # GameStatus


# ====================== PYDANTIC СХЕМЫ ======================
class PlayerAction(BaseModel):
    player_id: str
    action: str  # "bet", "play_card", "fold"
    amount: Optional[int] = None
    card: Optional[str] = None


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
                "folded": False
            } for pid in player_ids
        }
        self.table = []
        self.pot = 0
        self.current_bet = 0

    def _generate_deck(self) -> List[str]:
        """Генерация колоды из 21 карты (4 туза, 4 короля, 4 дамы, 4 десятки, 4 девятки + джокер)"""
        ranks = ['A', 'K', 'Q', '10', '9']
        suits = ['♠', '♥', '♦', '♣']
        deck = [f"{r}{s}" for s in suits for r in ranks]
        deck.remove(self.joker)  # Удаляем джокер из колоды
        return deck + [self.joker]  # Добавляем его отдельно

    def _deal_hand(self) -> List[str]:
        """Раздача 3 карт игроку"""
        return [self.deck.pop() for _ in range(3)]

    def calculate_score(self, cards: List[str]) -> int:
        """Подсчет очков:
        - Туз = 11
        - Джокер (9♣) = 11
        - Остальные = 10
        - Учитывается только одна масть!
        """
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
        return max_score

    def place_bet(self, player_id: str, amount: int) -> bool:
        """Обработка ставки"""
        if self.players[player_id]["balance"] >= amount:
            self.players[player_id]["balance"] -= amount
            self.pot += amount
            self.current_bet = amount
            return True
        return False

    def play_card(self, player_id: str, card: str) -> bool:
        """Обработка хода с картой"""
        if card in self.players[player_id]["cards"]:
            self.players[player_id]["cards"].remove(card)
            self.table.append(card)
            return True
        return False

    def handle_svara(self, players: List[str]) -> bool:
        """Обработка 'свары' (повторной игры между победителями)"""
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
    """Менеджер WebSocket-подключений"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[game_id] = websocket

    def disconnect(self, game_id: str):
        del self.active_connections[game_id]


manager = ConnectionManager()
active_games: Dict[str, SekaGame] = {}


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(game_id, websocket)
    game = active_games.get(game_id)

    try:
        while True:
            data = await websocket.receive_json()
            action = PlayerAction(**data)

            if action.action == "bet":
                if game.place_bet(action.player_id, action.amount):
                    await websocket.send_json({"status": "bet_accepted"})
                else:
                    await websocket.send_json({"error": "Недостаточно средств"})

            elif action.action == "play_card":
                if game.play_card(action.player_id, action.card):
                    await websocket.send_json({"status": "card_played"})
                else:
                    await websocket.send_json({"error": "Недопустимый ход"})

    except WebSocketDisconnect:
        manager.disconnect(game_id)


@app.post("/create_game")
async def create_game(player_ids: List[str]):
    game_id = str(uuid.uuid4())
    active_games[game_id] = SekaGame(player_ids)

    # Сохраняем в PostgreSQL
    db = SessionLocal()
    db.add(GameModel(
        id=game_id,
        players={pid: {"cards": [], "balance": 1000} for pid in player_ids},
        deck=active_games[game_id].deck,
        table=[],
        pot=0,
        status=GameStatus.WAITING
    ))
    db.commit()

    return {"game_id": game_id}


# ====================== ЗАПУСК ======================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)