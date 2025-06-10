import logging
import sys
import os
import asyncio
import hashlib
import hmac
from urllib.parse import parse_qsl, unquote
import json
from typing import Dict, Set, Optional
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.websockets import WebSocketState
import redis.asyncio as redis
from starlette import status

from game.engine import GameState
from config import REDIS_CONFIG, settings
from src.utils.telegram_auth import verify_telegram_data
from db import get_db
from wallet import WalletManager
from sqlalchemy.orm import Session

# --- Настройка логирования ---
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('seka_game')

# --- Инициализация FastAPI ---
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static and Template Setup ---
app.mount("/static", StaticFiles(directory="pages/static"), name="static_files")
templates = Jinja2Templates(directory="pages")

# --- Redis ---
redis_master = redis.Redis(**REDIS_CONFIG['master'])
redis_slave = redis.Redis(**REDIS_CONFIG['slave'])

# --- Менеджеры ---
class ConnectionManager:
    """Управляет WebSocket-соединениями."""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        self.active_connections[player_id] = websocket
        logger.info(f"Player {player_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
            logger.info(f"Player {player_id} disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in self.active_connections:
            websocket = self.active_connections[player_id]
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)
            else:
                logger.warning(f"Attempted to send message to disconnected player {player_id}")
                self.disconnect(player_id)

    async def broadcast(self, message: dict, player_ids: list):
        for player_id in player_ids:
            await self.send_personal_message(message, player_id)

class GameStateManager:
    """Управляет состоянием игр в Redis."""
    def __init__(self, redis_master, redis_slave):
        self.redis_master = redis_master
        self.redis_slave = redis_slave
        self.games_key = "seka:games"
        self.players_key = "seka:players"
        self.waiting_key = "seka:waiting"
        self.player_games_key = "seka:player_games"
        self._initialized = False

    async def initialize(self):
        if not self._initialized:
            try:
                await self.redis_master.ping()
                await self.redis_slave.ping()
                logger.info("Successfully connected to Redis master and slave.")
                self._initialized = True
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                raise

    async def add_waiting_player(self, player_id: str):
        active_game = await self.get_player_active_game(player_id)
        if active_game:
            logger.warning(f"Player {player_id} is already in game {active_game}.")
            return False
        await self.redis_master.sadd(self.waiting_key, player_id)
        return True

    async def get_waiting_players(self) -> Set[str]:
        return await self.redis_slave.smembers(self.waiting_key)

    async def remove_waiting_players(self, player_ids: list):
        if player_ids:
            await self.redis_master.srem(self.waiting_key, *player_ids)
            
    async def get_player_active_game(self, player_id: str) -> Optional[str]:
        return await self.redis_slave.hget(self.player_games_key, player_id)

    async def get_player_balance(self, player_id: str) -> int:
        balance = await self.redis_slave.hget(self.players_key, player_id)
        return int(balance) if balance else 1000  # Default balance

    async def save_game(self, game_id: str, game_state: GameState):
        async with self.redis_master.pipeline() as pipe:
            pipe.hset(self.games_key, game_id, json.dumps(game_state.to_dict()))
            for player_id in game_state.players:
                pipe.hset(self.player_games_key, player_id, game_id)
            await pipe.execute()

    async def get_game(self, game_id: str) -> Optional[GameState]:
        game_data = await self.redis_slave.hget(self.games_key, game_id)
        if game_data:
            game = GameState()
            game.from_dict(json.loads(game_data))
            return game
        return None

manager = ConnectionManager()
game_manager = GameStateManager(redis_master, redis_slave)

# --- Фоновые задачи ---
async def monitor_game_state():
    """Мониторит очередь ожидания и создает игры."""
    while True:
        await asyncio.sleep(5)
        try:
            waiting_players = list(await game_manager.get_waiting_players())
            logger.info(f"Monitoring: {len(waiting_players)} waiting players.")
            
            if len(waiting_players) >= 6:
                players_for_game = waiting_players[:6]
                game_id = f"game_{int(time.time())}"
                game = GameState()
                
                for player_id in players_for_game:
                    user_info_json = await redis_master.get(f"seka:user_info:{player_id}")
                    if user_info_json:
                        user_info = json.loads(user_info_json)
                        game.add_player(player_id, user_info)
                        await redis_master.delete(f"seka:user_info:{player_id}")
                    else:
                        logger.warning(f"User info for player {player_id} not found in Redis. Removing from waiting queue.")
                        await game_manager.remove_waiting_players([player_id])

                if len(game.players) > 0:
                    await game_manager.save_game(game_id, game)
                    await game_manager.remove_waiting_players(players_for_game)
                    logger.info(f"Created game {game_id} for players: {list(game.players.keys())}")
                    
                    await manager.broadcast({
                        "type": "game_created",
                        "game_id": game_id,
                        "game_state": game.to_dict()
                    }, list(game.players.keys()))
                else:
                    logger.warning("Game creation aborted because no player info could be retrieved.")

        except Exception as e:
            logger.error(f"Error in game state monitor: {e}")

# --- Обработчики жизненного цикла ---
@app.on_event("startup")
async def on_startup():
    """Действия при старте приложения."""
    try:
        await redis_master.ping()
        await redis_slave.ping()
        logger.info("Successfully connected to Redis master and slave.")
        asyncio.create_task(monitor_game_state())
        logger.info("Game state monitor started.")
    except Exception as e:
        logger.error(f"Application startup failed: {e}")

@app.on_event("shutdown")
async def on_shutdown():
    """Действия при остановке приложения."""
    logger.info("Application shutting down.")

# --- HTML-Serving Routes ---
@app.get("/", response_class=HTMLResponse)
async def read_root():
    return RedirectResponse(url="/main_menu.html")

@app.get("/{page_name}.html", response_class=HTMLResponse)
async def serve_html_page(request: Request, page_name: str):
    try:
        return templates.TemplateResponse(f"{page_name}.html", {"request": request})
    except Exception:
        raise HTTPException(status_code=404, detail="Page not found")

# --- WebSocket эндпоинт ---
@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    """Обрабатывает WebSocket-соединения от игроков."""
    init_data = websocket.query_params.get("initData")
    if not init_data or not verify_telegram_data(init_data, settings.BOT_TOKEN):
        logger.warning(f"WebSocket connection rejected for player {player_id}: Invalid initData")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    try:
        decoded_init_data = unquote(init_data)
        params = dict(parse_qsl(decoded_init_data))
        user_data = json.loads(params.get('user', '{}'))
        player_id_from_data = str(user_data.get('id'))
        
        if not player_id_from_data or player_id_from_data != player_id:
             raise ValueError("Player ID mismatch")

        await manager.connect(websocket, player_id)
        # Store user info for game creation
        await redis_master.set(f"seka:user_info:{player_id}", json.dumps(user_data))

        try:
            while True:
                data = await websocket.receive_json()
                logger.info(f"Received from {player_id}: {data}")
                
                # Game logic handling
                # ... 

        except WebSocketDisconnect:
            manager.disconnect(player_id)
            # Maybe notify others in the game
            logger.info(f"Player {player_id} has disconnected.")
    except ValueError as e:
        logger.error(f"ValueError during WebSocket connection for {player_id}: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except Exception as e:
        logger.error(f"Error in WebSocket for player {player_id}: {e}")
        manager.disconnect(player_id)


# --- API эндпоинты ---
@app.post('/api/validate-init-data')
async def validate_init_data_endpoint(request: Request):
    try:
        init_data = await request.body()
        if verify_telegram_data(init_data.decode(), settings.BOT_TOKEN):
            return JSONResponse({'valid': True})
        return JSONResponse({'valid': False, 'message': 'Invalid signature'}, status_code=403)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return JSONResponse({'valid': False, 'message': 'Server error'}, status_code=500)

@app.get("/api/wallet/balance")
async def get_balance(telegram_id: int, db: Session = Depends(get_db)):
    wallet_manager = WalletManager(db)
    balance = await wallet_manager.get_balance(telegram_id)
    if balance is None:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse({"balance": balance})

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

logger.info("Application configured.")

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable or default to 8080
    port = int(os.getenv("PORT", 8080))
    logger.info(f"Starting server on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)