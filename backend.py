import os
import random
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Union

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import redis
import httpx
from urllib.parse import parse_qs

# ====================== НАСТРОЙКИ ======================
class Settings(BaseModel):
    POSTGRES_DB: str = "seka"
    POSTGRES_USER: str = "seka_user"
    POSTGRES_PASSWORD: str = "your_password"
    POSTGRES_HOST: str = "localhost"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    AVATAR_CACHE_DIR: str = "static/avatars"

settings = Settings()
os.makedirs(settings.AVATAR_CACHE_DIR, exist_ok=True)

# ====================== ПОДКЛЮЧЕНИЕ К БАЗАМ ДАННЫХ ======================
def get_db_connection():
    conn = psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST
    )
    return conn

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
    SVARA = "svara"

class TransactionType(str, Enum):
    BET = "bet"
    WIN = "win"
    LOSS = "loss"
    FOLD = "fold"
    SVARA = "svara"
    JOIN = "join"
    BLUFF = "bluff"

class Player(BaseModel):
    id: str
    telegram_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    balance: int = 1000
    position: Optional[str] = None  # left or right

class PlayerResponse(BaseModel):
    id: str
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    position: Optional[str] = None
    is_current: bool = False

class GameStateResponse(BaseModel):
    bank_amount: float
    current_turn: str
    players: List[Dict[str, Union[str, float, bool]]]

# ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======================
def get_avatar_path(player_id: str) -> str:
    return f"{settings.AVATAR_CACHE_DIR}/{player_id}.jpg"

async def cache_avatar(player_id: str, photo_url: str) -> Optional[str]:
    if not photo_url:
        return None
        
    cached_path = get_avatar_path(player_id)
    if not os.path.exists(cached_path):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(photo_url)
                if response.status_code == 200:
                    with open(cached_path, "wb") as f:
                        f.write(response.content)
                    return f"/{cached_path}"
        except Exception as e:
            print(f"Error caching avatar: {e}")
    return f"/{cached_path}"

def parse_telegram_user(init_data: str) -> Optional[Dict]:
    try:
        parsed_data = parse_qs(init_data)
        user_data = json.loads(parsed_data.get("user", [""])[0])
        return {
            "id": str(user_data.get("id")),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "username": user_data.get("username"),
            "photo_url": user_data.get("photo_url")
        }
    except Exception as e:
        print(f"Error parsing Telegram user: {e}")
        return None

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
        self.pot = 0
        self.current_bet = 0
        self.bluffers = set()
        self.svara_pot = 0
        create_game_in_db(self.game_id, player_ids)
        for player_id in player_ids:
            set_player_online(player_id)
            record_transaction(self.game_id, player_id, 0, TransactionType.JOIN)

  
        
        # Инициализация в БД
        create_game_in_db(self.game_id, player_ids)
        for player_id in player_ids:
            set_player_online(player_id)
            record_transaction(self.game_id, player_id, 0, TransactionType.JOIN)

    def start_game(self):
        """Начало игры с раздачей карт"""
        self.status = GameStatus.ACTIVE
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Создание колоды
            deck = [f"{rank}{suit}" for suit in ["♠", "♥", "♦", "♣"] 
                    for rank in ["A", "K", "Q", "10"]] + ["9♣"]
            random.shuffle(deck)
            
            # Раздача карт
            for player_id in self.player_ids:
                cards = [deck.pop() for _ in range(3)]
                cur.execute(
                    "UPDATE game_players SET cards = %s, bet = 0, folded = FALSE, score = NULL "
                    "WHERE game_id = %s AND player_id = %s",
                    (json.dumps(cards), self.game_id, player_id)
                )
            
            # Сохранение состояния
            cur.execute(
                "UPDATE games SET deck = %s, status = %s, pot = 0 "
                "WHERE id = %s",
                (json.dumps(deck), GameStatus.ACTIVE.value, self.game_id)
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def place_bet(self, player_id: str, amount: int, is_bluff: bool = False) -> bool:
        """Обработка ставки игрока"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Проверяем баланс
            cur.execute("SELECT balance FROM players WHERE id = %s", (player_id,))
            balance = cur.fetchone()[0]
            
            if balance >= amount:
                # Обновляем баланс и ставку
                cur.execute(
                    "UPDATE players SET balance = balance - %s WHERE id = %s",
                    (amount, player_id)
                )
                
                # Фиксируем ставку
                self.pot += amount
                self.current_bet = amount
                
                if is_bluff:
                    self.bluffers.add(player_id)
                
                # Запись в БД
                cur.execute(
                    "UPDATE games SET pot = %s WHERE id = %s",
                    (self.pot, self.game_id)
                )
                
                record_transaction(
                    self.game_id, player_id, amount, 
                    TransactionType.BET if not is_bluff else TransactionType.SVARA
                )
                
                conn.commit()
                return True
            return False
        finally:
            cur.close()
            conn.close()

    def fold(self, player_id: str):
        """Игрок сбрасывает карты"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE game_players SET folded = TRUE "
                "WHERE game_id = %s AND player_id = %s",
                (self.game_id, player_id)
            )
            record_transaction(self.game_id, player_id, 0, TransactionType.FOLD)
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def calculate_scores(self):
        """Подсчет очков для всех активных игроков"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT player_id, cards FROM game_players "
                "WHERE game_id = %s AND folded = FALSE",
                (self.game_id,)
            )
            
            for player_id, cards_json in cur.fetchall():
                cards = json.loads(cards_json)
                score = self._calculate_score(cards)
                
                # Обновляем счет игрока
                cur.execute(
                    "UPDATE game_players SET score = %s "
                    "WHERE game_id = %s AND player_id = %s",
                    (score, self.game_id, player_id)
                )
            
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def _calculate_score(self, cards: List[str]) -> int:
        """Приватный метод подсчета очков"""
        suits = {}
        for card in cards:
            suit = card[-1]
            rank = card[:-1]
            suits.setdefault(suit, []).append(rank)
        
        max_score = 0
        for suit, ranks in suits.items():
            score = sum(
                11 if (rank == "A" or card == "9♣") else 10
                for card in ranks
            )
            max_score = max(max_score, score)
        
        # Проверка на "Два лба" (2 туза)
        if sum(1 for card in cards if card.startswith("A")) >= 2:
            max_score = max(max_score, 22)
        
        return max_score

    def determine_winner(self):
        """Определение победителя"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Получаем всех активных игроков с их счетами
            cur.execute(
                "SELECT player_id, score FROM game_players "
                "WHERE game_id = %s AND folded = FALSE "
                "ORDER BY score DESC",
                (self.game_id,)
            )
            results = cur.fetchall()
            
            if not results:
                return None
                
            max_score = results[0][1]
            winners = [player_id for player_id, score in results if score == max_score]
            
            # Если один победитель
            if len(winners) == 1:
                winner_id = winners[0]
                self._distribute_winnings(winner_id, self.pot + self.svara_pot)
                return {"winner": winner_id, "score": max_score, "is_svara": False}
            
            # Если ничья - активируем свару
            else:
                self._initiate_svara(winners)
                return {"winners": winners, "score": max_score, "is_svara": True}
        finally:
            cur.close()
            conn.close()

    def _initiate_svara(self, player_ids: List[str]):
        """Инициализация свары"""
        self.svara_pot = self.pot
        self.pot = 0
        self.status = GameStatus.SVARA
        
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Сбрасываем ставки и фолды, но сохраняем карты
            for player_id in player_ids:
                cur.execute(
                    "UPDATE game_players SET bet = 0, folded = FALSE "
                    "WHERE game_id = %s AND player_id = %s",
                    (self.game_id, player_id)
                )
            
            # Обновляем статус игры
            cur.execute(
                "UPDATE games SET status = %s, pot = 0, table_cards = '[]' "
                "WHERE id = %s",
                (GameStatus.SVARA.value, self.game_id)
            )
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def _distribute_winnings(self, winner_id: str, amount: int):
        """Выплата выигрыша"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Начисляем выигрыш
            cur.execute(
                "UPDATE players SET balance = balance + %s "
                "WHERE id = %s",
                (amount, winner_id)
            )
            
            # Фиксируем завершение игры
            self.status = GameStatus.FINISHED
            cur.execute(
                "UPDATE games SET status = %s, finished_at = NOW() "
                "WHERE id = %s",
                (GameStatus.FINISHED.value, self.game_id)
            )
            
            record_transaction(self.game_id, winner_id, amount, TransactionType.WIN)
            conn.commit()
        finally:
            cur.close()
            conn.close()

    def handle_bluff(self, player_id: str) -> bool:
        """Обработка попытки блефа"""
        if player_id not in self.bluffers:
            self.bluffers.add(player_id)
            return True
        return False

    def get_game_state(self):
        """Получение текущего состояния игры"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT id, status, pot FROM games WHERE id = %s",
                (self.game_id,)
            )
            game_data = cur.fetchone()
            
            cur.execute(
                "SELECT player_id, cards, bet, folded, score FROM game_players "
                "WHERE game_id = %s",
                (self.game_id,)
            )
            players_data = cur.fetchall()
            
            return {
                "game_id": game_data[0],
                "status": game_data[1],
                "pot": game_data[2],
                "players": [
                    {
                        "player_id": p[0],
                        "cards": json.loads(p[1]),
                        "bet": p[2],
                        "folded": p[3],
                        "score": p[4]
                    } for p in players_data
                ],
                "svara_pot": self.svara_pot
            }
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

@app.get("/get_player_data")
async def get_player_data(request: Request):
    """Получаем данные текущего пользователя из Telegram"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    return user_data

@app.get("/get_players")
async def get_players(request: Request):
    """Получаем список всех игроков в текущей игре"""
    try:
        # Получаем данные текущего пользователя
        init_data = request.headers.get("X-Telegram-Init-Data")
        current_user = parse_telegram_user(init_data) if init_data else None
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Получаем активную игру
        cur.execute("SELECT id FROM games WHERE status != %s ORDER BY created_at DESC LIMIT 1", 
                   (GameStatus.FINISHED.value,))
        game = cur.fetchone()
        
        if not game:
            return []
        
        game_id = game[0]
        
        # Получаем игроков в этой игре
        cur.execute("""
            SELECT p.id, p.telegram_id, p.first_name, p.last_name, p.username, p.photo_url, p.balance, gp.position
            FROM game_players gp
            JOIN players p ON gp.player_id = p.id
            WHERE gp.game_id = %s
        """, (game_id,))
        
        players = []
        for row in cur.fetchall():
            player = {
                "id": row[0],
                "first_name": row[2],
                "last_name": row[3],
                "username": row[4],
                "photo_url": await cache_avatar(row[0], row[5]),
                "balance": row[6],
                "position": row[7],
                "is_current": current_user and str(current_user["id"]) == str(row[0])
            }
            players.append(player)
        
        return players
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.get("/get_game_state")
async def get_game_state():
    """Получаем текущее состояние игры"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Получаем активную игру
        cur.execute("""
            SELECT id, pot FROM games 
            WHERE status != %s 
            ORDER BY created_at DESC LIMIT 1
        """, (GameStatus.FINISHED.value,))
        game = cur.fetchone()
        
        if not game:
            return {"bank_amount": 0, "current_turn": None, "players": []}
        
        game_id, bank_amount = game
        
        # Получаем текущего игрока
        cur.execute("""
            SELECT p.first_name FROM game_players gp
            JOIN players p ON gp.player_id = p.id
            WHERE gp.game_id = %s AND gp.is_turn = TRUE
        """, (game_id,))
        current_turn = cur.fetchone()
        current_turn = current_turn[0] if current_turn else None
        
        # Получаем данные игроков
        cur.execute("""
            SELECT p.id, p.first_name, p.last_name, p.photo_url, p.balance, 
                   gp.bet, gp.folded, gp.score, gp.position
            FROM game_players gp
            JOIN players p ON gp.player_id = p.id
            WHERE gp.game_id = %s
        """, (game_id,))
        
        players = []
        for row in cur.fetchall():
            player = {
                "id": row[0],
                "name": f"{row[1]} {row[2]}" if row[2] else row[1],
                "balance": row[4],
                "bet": row[5],
                "folded": row[6],
                "score": row[7],
                "position": row[8],
                "avatar": await cache_avatar(row[0], row[3])
            }
            
            # Определяем действие
            if row[6]:  # folded
                player["action"] = "Пас"
            elif row[5] > 0:  # bet
                player["action"] = "Ставка"
            else:
                player["action"] = "Ожидание"
            
            players.append(player)
        
        return {
            "bank_amount": bank_amount,
            "current_turn": current_turn,
            "players": players
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await websocket.accept()
    set_player_online(player_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["action"] == "join_queue":
                add_player_to_queue(player_id)
                await websocket.send_json({
                    "status": "added_to_queue",
                    "player_id": player_id
                })
            elif data["action"] == "get_updates":
                game_state = get_game_state()
                await websocket.send_json({
                    "type": "game_state",
                    "data": game_state
                })
            elif data["action"] == "place_bet":
                # Здесь должна быть логика обработки ставки
                pass
            elif data["action"] == "fold":
                # Здесь должна быть логика обработки фолда
                pass
                
    except WebSocketDisconnect:
        redis_client.set(f"player:{player_id}:online", "false")
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.post("/create_game")
async def create_game():
    """Создаем новую игру с игроками из очереди"""
    players = get_players_in_queue(2)
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Not enough players in queue")
    
    game = SekaGame(players)
    game.start_game()
    return {"game_id": game.game_id, "players": players}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
