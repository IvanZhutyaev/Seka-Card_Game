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
from pathlib import Path


# ====================== НАСТРОЙКИ ======================
class Settings:
    def __init__(self):
        # PostgreSQL настройки
        self.POSTGRES_DB = os.getenv('POSTGRES_DB', 'postgres')
        self.POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
        self.POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
        self.POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
        self.POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')

        # Redis настройки
        self.REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
        self.REDIS_PORT = os.getenv('REDIS_PORT', '6379')

        # Другие настройки
        self.AVATAR_CACHE_DIR = os.getenv('AVATAR_CACHE_DIR', 'static/avatars')
        self.TELEGRAM_BOT_TOKEN = os.getenv('BOT_TOKEN', '')

        # Создаем директорию для аватарок
        os.makedirs(self.AVATAR_CACHE_DIR, exist_ok=True)


# Инициализация настроек
settings = Settings()

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
    telegram_id: str
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    balance: int = 1000
    position: Optional[str] = None

class PlayerResponse(BaseModel):
    id: str
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    position: Optional[str] = None
    is_current: bool = False
    balance: int

class GameStateResponse(BaseModel):
    game_id: str
    status: str
    bank_amount: float
    current_turn: str
    players: List[PlayerResponse]
    your_cards: Optional[List[str]] = None
    your_bet: Optional[int] = None
    your_folded: Optional[bool] = None

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

async def get_telegram_user_data(telegram_id: str) -> Optional[Dict]:
    """Получаем данные пользователя из Telegram API"""
    try:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getChat"
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"chat_id": telegram_id})
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    return {
                        "id": str(data["result"]["id"]),
                        "first_name": data["result"].get("first_name"),
                        "last_name": data["result"].get("last_name"),
                        "username": data["result"].get("username"),
                        "photo_url": await get_telegram_user_photo(telegram_id)
                    }
        return None
    except Exception as e:
        print(f"Error getting Telegram user data: {e}")
        return None

async def get_telegram_user_photo(telegram_id: str) -> Optional[str]:
    """Получаем фото профиля пользователя Telegram"""
    try:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUserProfilePhotos"
        params = {"user_id": telegram_id, "limit": 1}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok") and data["result"]["total_count"] > 0:
                    file_id = data["result"]["photos"][0][0]["file_id"]
                    
                    # Получаем путь к файлу
                    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getFile"
                    response = await client.post(url, json={"file_id": file_id})
                    if response.status_code == 200:
                        file_path = response.json()["result"]["file_path"]
                        return f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
        return None
    except Exception as e:
        print(f"Error getting Telegram user photo: {e}")
        return None

def parse_telegram_user(init_data: str) -> Optional[Dict]:
    try:
        parsed_data = parse_qs(init_data)
        user_data = json.loads(parsed_data.get("user", [""])[0])
        return {
            "id": str(user_data.get("id")),
            "telegram_id": str(user_data.get("id")),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "username": user_data.get("username"),
            "photo_url": user_data.get("photo_url")
        }
    except Exception as e:
        print(f"Error parsing Telegram user: {e}")
        return None

# ====================== МЕТОДЫ ДЛЯ РАБОТЫ С POSTGRESQL ======================
def create_game_in_db(game_id: str, players: List[Dict]):
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
        for player in players:
            # Проверяем существует ли игрок
            cur.execute(
                "INSERT INTO players (id, telegram_id, first_name, last_name, username, photo_url, balance) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) "
                "ON CONFLICT (id) DO UPDATE SET "
                "first_name = EXCLUDED.first_name, "
                "last_name = EXCLUDED.last_name, "
                "username = EXCLUDED.username, "
                "photo_url = EXCLUDED.photo_url",
                (player["id"], player["telegram_id"], player["first_name"], 
                 player.get("last_name"), player.get("username"), 
                 player.get("photo_url"), 1000)
            )
            
            # Добавляем связь игрока с игрой
            cur.execute(
                "INSERT INTO game_players (game_id, player_id, cards, bet, folded, position) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (game_id, player["id"], json.dumps([]), 0, False, 
                 "left" if len(players) == 1 else "right")
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

def update_player_turn(game_id: str, player_id: str):
    """Обновляем текущего игрока, который должен сделать ход"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Сбрасываем флаг is_turn у всех игроков
        cur.execute(
            "UPDATE game_players SET is_turn = FALSE WHERE game_id = %s",
            (game_id,)
        )
        
        # Устанавливаем флаг is_turn для текущего игрока
        cur.execute(
            "UPDATE game_players SET is_turn = TRUE "
            "WHERE game_id = %s AND player_id = %s",
            (game_id, player_id)
        )
        
        conn.commit()
    finally:
        cur.close()
        conn.close()

# ====================== МЕТОДЫ ДЛЯ РАБОТЫ С REDIS ======================
def set_player_online(player_id: str):
    """Устанавливаем статус онлайн для игрока"""
    redis_client.set(f"player:{player_id}:online", "true", ex=300)  # TTL 5 минут

def add_player_to_queue(player_data: Dict):
    """Добавляем игрока в очередь"""
    player_id = player_data["id"]
    redis_client.lpush("seka:queue", json.dumps(player_data))
    set_player_online(player_id)

def get_players_in_queue(count: int = 2) -> List[Dict]:
    """Получаем игроков из очереди для создания игры"""
    players = []
    for _ in range(count):
        player_json = redis_client.rpop("seka:queue")
        if player_json:
            players.append(json.loads(player_json))
    return players

# ====================== ИГРОВАЯ ЛОГИКА ======================
class SekaGame:
    def __init__(self, players_data: List[Dict]):
        self.game_id = str(uuid.uuid4())
        self.players_data = players_data
        self.player_ids = [p["id"] for p in players_data]
        self.status = GameStatus.WAITING
        self.pot = 0
        self.current_bet = 0
        self.bluffers = set()
        self.svara_pot = 0
        self.current_player_index = 0
        
        create_game_in_db(self.game_id, players_data)
        for player in players_data:
            set_player_online(player["id"])
            record_transaction(self.game_id, player["id"], 0, TransactionType.JOIN)
        
        # Устанавливаем первого игрока для хода
        if self.player_ids:
            update_player_turn(self.game_id, self.player_ids[0])

    def start_game(self):
        """Начало игры с раздачей карт"""
        self.status = GameStatus.ACTIVE
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Создание колоды (4 десятки, 4 короля, 4 дамы, 4 туза, 4 валета и одна 9 треф)
            deck = (
                [f"10{suit}" for suit in ["♠", "♥", "♦", "♣"]] +
                [f"K{suit}" for suit in ["♠", "♥", "♦", "♣"]] +
                [f"Q{suit}" for suit in ["♠", "♥", "♦", "♣"]] +
                [f"A{suit}" for suit in ["♠", "♥", "♦", "♣"]] +
                [f"J{suit}" for suit in ["♠", "♥", "♦", "♣"]] +
                ["9♣"]  # Джокер
            )
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
        if player_id != self.player_ids[self.current_player_index]:
            return False
            
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
                
                # Обновляем ставку игрока в игре
                cur.execute(
                    "UPDATE game_players SET bet = %s "
                    "WHERE game_id = %s AND player_id = %s",
                    (amount, self.game_id, player_id)
                )
                
                # Запись в БД
                cur.execute(
                    "UPDATE games SET pot = %s WHERE id = %s",
                    (self.pot, self.game_id)
                )
                
                record_transaction(
                    self.game_id, player_id, amount, 
                    TransactionType.BET if not is_bluff else TransactionType.BLUFF
                )
                
                # Передаем ход следующему игроку
                self._next_player()
                
                conn.commit()
                return True
            return False
        finally:
            cur.close()
            conn.close()

    def fold(self, player_id: str):
        """Игрок сбрасывает карты"""
        if player_id != self.player_ids[self.current_player_index]:
            return False
            
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE game_players SET folded = TRUE "
                "WHERE game_id = %s AND player_id = %s",
                (self.game_id, player_id)
            )
            record_transaction(self.game_id, player_id, 0, TransactionType.FOLD)
            
            # Передаем ход следующему игроку
            self._next_player()
            
            conn.commit()
            return True
        finally:
            cur.close()
            conn.close()

    def _next_player(self):
        """Передаем ход следующему игроку"""
        self.current_player_index = (self.current_player_index + 1) % len(self.player_ids)
        next_player_id = self.player_ids[self.current_player_index]
        update_player_turn(self.game_id, next_player_id)

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
        """Приватный метод подсчета очков по правилам Сека"""
        suits = {}
        for card in cards:
            suit = card[-1]
            rank = card[:-1]
            suits.setdefault(suit, []).append(rank)
        
        max_score = 0
        for suit, ranks in suits.items():
            score = sum(
                11 if rank == "A" else 
                10 if rank in ["K", "Q", "J", "10"] else
                11 if card == "9♣" else 0
                for card in ranks
            )
            max_score = max(max_score, score)
        
        # Проверка на "Два лба" (2 туза)
        if sum(1 for card in cards if card.startswith("A")) >= 2:
            max_score = max(max_score, 22)
        
        # Проверка на комбинации из 3 карт
        if len(cards) == 3 and all(card[:-1] == cards[0][:-1] for card in cards):
            rank = cards[0][:-1]
            if rank == "A":
                return 33  # 3 туза - самая сильная комбинация
            elif rank == "K":
                return 32
            elif rank == "Q":
                return 31
            elif rank == "J":
                return 30
            elif rank == "10":
                return 29
            elif rank == "9":
                return 28  # 3 девятки (хотя в колоде только одна 9♣)
        
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
        self.current_player_index = 0
        
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
            
            # Устанавливаем первого игрока для хода в сваре
            if player_ids:
                update_player_turn(self.game_id, player_ids[0])
            
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

    def get_game_state(self, for_player_id: Optional[str] = None) -> Dict:
        """Получение текущего состояния игры"""
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            # Получаем данные игры
            cur.execute(
                "SELECT id, status, pot FROM games WHERE id = %s",
                (self.game_id,)
            )
            game_data = cur.fetchone()
            
            # Получаем данные игроков
            cur.execute(
                "SELECT gp.player_id, gp.cards, gp.bet, gp.folded, gp.score, gp.position, gp.is_turn, "
                "p.first_name, p.last_name, p.username, p.photo_url, p.balance "
                "FROM game_players gp "
                "JOIN players p ON gp.player_id = p.id "
                "WHERE gp.game_id = %s",
                (self.game_id,)
            )
            players_data = cur.fetchall()
            
            # Получаем текущего игрока
            current_player = next((p[0] for p in players_data if p[6]), None)
            
            # Формируем данные игроков для ответа
            players = []
            your_cards = None
            your_bet = None
            your_folded = None
            
            for p in players_data:
                player_id, cards, bet, folded, score, position, is_turn, first_name, last_name, username, photo_url, balance = p
                
                if player_id == for_player_id:
                    your_cards = json.loads(cards) if cards else []
                    your_bet = bet
                    your_folded = folded
                
                player_info = {
                    "id": player_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "username": username,
                    "photo_url": photo_url,
                    "balance": balance,
                    "position": position,
                    "bet": bet,
                    "folded": folded,
                    "score": score,
                    "is_current": is_turn
                }
                players.append(player_info)
            
            return {
                "game_id": game_data[0],
                "status": game_data[1],
                "bank_amount": game_data[2],
                "current_turn": current_player,
                "players": players,
                "your_cards": your_cards,
                "your_bet": your_bet,
                "your_folded": your_folded,
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

active_games = {}  # game_id: SekaGame

@app.get("/get_player_data")
async def get_player_data(request: Request):
    """Получаем данные текущего пользователя из Telegram"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    # Дополняем данные из Telegram API если нужно
    if not user_data.get("photo_url"):
        photo_url = await get_telegram_user_photo(user_data["telegram_id"])
        if photo_url:
            user_data["photo_url"] = photo_url
    
    return user_data

@app.post("/join_queue")
async def join_queue(request: Request):
    """Добавляем игрока в очередь для игры"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    # Добавляем игрока в очередь
    add_player_to_queue(user_data)
    
    return {"status": "added_to_queue", "player_id": user_data["id"]}

@app.get("/check_game")
async def check_game(request: Request):
    """Проверяем, есть ли активная игра для пользователя"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    player_id = user_data["id"]
    
    # Проверяем Redis на наличие игрока в активной игре
    game_id = redis_client.get(f"player:{player_id}:game")
    if game_id and game_id in active_games:
        game = active_games[game_id]
        game_state = game.get_game_state(player_id)
        return {"has_game": True, "game_state": game_state}
    
    return {"has_game": False}

@app.post("/create_game")
async def create_game():
    """Создаем новую игру с игроками из очереди"""
    players = get_players_in_queue(2)
    if len(players) < 2:
        raise HTTPException(status_code=400, detail="Not enough players in queue")
    
    game = SekaGame(players)
    game.start_game()
    
    # Сохраняем игру в активных играх
    active_games[game.game_id] = game
    
    # Сохраняем информацию об игре для игроков в Redis
    for player in players:
        redis_client.set(f"player:{player['id']}:game", game.game_id, ex=3600)  # 1 час
    
    return {"game_id": game.game_id, "players": [p["id"] for p in players]}

@app.post("/place_bet")
async def place_bet(request: Request, amount: int, is_bluff: bool = False):
    """Обработка ставки игрока"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    player_id = user_data["id"]
    
    # Получаем активную игру игрока
    game_id = redis_client.get(f"player:{player_id}:game")
    if not game_id or game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    success = game.place_bet(player_id, amount, is_bluff)
    
    if not success:
        raise HTTPException(status_code=400, detail="Cannot place bet")
    
    return {"status": "bet_placed", "amount": amount}

@app.post("/fold")
async def fold(request: Request):
    """Игрок сбрасывает карты"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    player_id = user_data["id"]
    
    # Получаем активную игру игрока
    game_id = redis_client.get(f"player:{player_id}:game")
    if not game_id or game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    success = game.fold(player_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Cannot fold")
    
    return {"status": "folded"}

@app.get("/game_state")
async def get_game_state(request: Request):
    """Получаем текущее состояние игры"""
    init_data = request.headers.get("X-Telegram-Init-Data")
    if not init_data:
        raise HTTPException(status_code=400, detail="No Telegram init data")
    
    user_data = parse_telegram_user(init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram user data")
    
    player_id = user_data["id"]
    
    # Получаем активную игру игрока
    game_id = redis_client.get(f"player:{player_id}:game")
    if not game_id or game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    game_state = game.get_game_state(player_id)
    
    return game_state

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await websocket.accept()
    set_player_online(player_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["action"] == "join_queue":
                # Для WebSocket нужно получать данные игрока иначе
                # Здесь упрощенная версия - в реальности нужно аутентифицировать
                add_player_to_queue({"id": player_id, "telegram_id": player_id})
                await websocket.send_json({
                    "status": "added_to_queue",
                    "player_id": player_id
                })
            elif data["action"] == "get_updates":
                game_id = redis_client.get(f"player:{player_id}:game")
                if game_id and game_id in active_games:
                    game = active_games[game_id]
                    game_state = game.get_game_state(player_id)
                    await websocket.send_json({
                        "type": "game_state",
                        "data": game_state
                    })
                else:
                    await websocket.send_json({
                        "type": "no_game"
                    })
            elif data["action"] == "place_bet":
                game_id = redis_client.get(f"player:{player_id}:game")
                if game_id and game_id in active_games:
                    game = active_games[game_id]
                    success = game.place_bet(player_id, data["amount"], data.get("is_bluff", False))
                    await websocket.send_json({
                        "status": "bet_placed" if success else "bet_failed",
                        "amount": data["amount"]
                    })
            elif data["action"] == "fold":
                game_id = redis_client.get(f"player:{player_id}:game")
                if game_id and game_id in active_games:
                    game = active_games[game_id]
                    success = game.fold(player_id)
                    await websocket.send_json({
                        "status": "folded" if success else "fold_failed"
                    })
                
    except WebSocketDisconnect:
        redis_client.set(f"player:{player_id}:online", "false")
    except Exception as e:
        print(f"WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
