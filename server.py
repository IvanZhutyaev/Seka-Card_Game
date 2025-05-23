import logging
import asyncio
from typing import Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from db import check_database_connection, get_redis, get_db
from game.matchmaking import MatchMaker
from game.engine import GameState

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

# Инициализация компонентов
matchmaker = MatchMaker(get_redis())

# Хранилище активных WebSocket соединений
active_connections: Dict[str, WebSocket] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.heartbeat_interval = 30  # секунд
        
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        asyncio.create_task(self._heartbeat(client_id))
        logger.info(f"✅ Клиент {client_id} подключился")
        
    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        logger.info(f"👋 Клиент {client_id} отключился")
        
    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"❌ Ошибка отправки сообщения клиенту {client_id}: {e}")
                await self.disconnect(client_id)
                
    async def broadcast(self, message: dict, exclude: Optional[str] = None):
        for client_id, connection in self.active_connections.items():
            if client_id != exclude:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"❌ Ошибка broadcast для клиента {client_id}: {e}")
                    
    async def _heartbeat(self, client_id: str):
        while client_id in self.active_connections:
            try:
                await self.send_personal_message({"type": "ping"}, client_id)
                await asyncio.sleep(self.heartbeat_interval)
            except:
                break
        self.disconnect(client_id)

manager = ConnectionManager()

@app.on_event("startup")
async def startup_event():
    """Проверка подключений при запуске сервера"""
    if not await check_database_connection():
        logger.error("❌ Ошибка подключения к базам данных")
        exit(1)
    logger.info("✅ Сервер успешно запущен")
    
    # Запускаем очистку зависших игр
    asyncio.create_task(matchmaker.cleanup_stale_games())

@app.get("/")
async def read_root(request: Request):
    return FileResponse("pages/gameplay/index.html")

@app.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await manager.connect(websocket, player_id)
    
    try:
        while True:
            try:
                data = await websocket.receive_json()
                await handle_websocket_message(websocket, player_id, data)
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"❌ Ошибка обработки сообщения от {player_id}: {e}")
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Ошибка обработки сообщения"
                    },
                    player_id
                )
    finally:
        manager.disconnect(player_id)
        # Удаляем из очереди при отключении
        await matchmaker.remove_from_queue(player_id)

async def handle_websocket_message(websocket: WebSocket, player_id: str, data: dict):
    """Обработка входящих WebSocket сообщений"""
    try:
        message_type = data.get("type")
        if not message_type:
            raise ValueError("Тип сообщения не указан")
            
        if message_type == "find_game":
            # Добавляем игрока в очередь
            rating = data.get("rating", 1000)
            await matchmaker.add_to_queue(player_id, rating)
            
            # Пытаемся найти матч
            match = await matchmaker.find_match(rating)
            if match:
                game_id = await matchmaker.create_game(match)
                # Уведомляем игроков
                for pid in match:
                    await manager.send_personal_message(
                        {
                            "type": "game_found",
                            "game_id": game_id
                        },
                        pid
                    )
            
        elif message_type == "game_action":
            game_id = data.get("game_id")
            action = data.get("action")
            
            if not game_id or not action:
                raise ValueError("Неверные параметры игрового действия")
                
            game_state = await matchmaker.get_game_state(game_id)
            if not game_state:
                raise ValueError("Игра не найдена")
                
            game = GameState()
            # Обновляем состояние игры
            if action == "bet":
                amount = data.get("amount", 0)
                if game.place_bet(player_id, amount):
                    # Уведомляем всех игроков
                    for pid in game.players:
                        await manager.send_personal_message(
                            {
                                "type": "game_state",
                                "data": game.to_dict()
                            },
                            pid
                        )
            
            elif action == "fold":
                game.fold(player_id)
                winner = game.get_winner()
                if winner:
                    # Игра завершена
                    await matchmaker.end_game(game_id)
                    # Уведомляем всех игроков
                    for pid in game.players:
                        await manager.send_personal_message(
                            {
                                "type": "game_over",
                                "winner": winner,
                                "bank": game.bank
                            },
                            pid
                        )
                
            # Сохраняем обновленное состояние
            await matchmaker.update_game_state(game_id, game)
            
        else:
            logger.warning(f"⚠️ Неизвестный тип сообщения: {message_type}")
            await manager.send_personal_message(
                {
                    "type": "error",
                    "message": "Неизвестный тип сообщения"
                },
                player_id
            )
            
    except Exception as e:
        logger.error(f"❌ Ошибка обработки сообщения: {e}")
        await manager.send_personal_message(
            {
                "type": "error",
                "message": str(e)
            },
            player_id
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 