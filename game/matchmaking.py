import logging
import asyncio
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json
from redis import Redis
from .engine import GameState

logger = logging.getLogger(__name__)

class MatchMaker:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.queue_key = "matchmaking_queue"
        self.games_key = "active_games"
        self.player_timeout = 30  # секунд
        
    async def add_to_queue(self, player_id: str, rating: int) -> None:
        """Добавляет игрока в очередь матчмейкинга"""
        # Сохраняем время добавления для таймаута
        player_data = {
            "id": player_id,
            "rating": rating,
            "joined_at": datetime.now().isoformat()
        }
        await self.redis.zadd(
            self.queue_key,
            {json.dumps(player_data): rating}
        )
        logger.info(f"Игрок {player_id} добавлен в очередь (рейтинг: {rating})")
    
    async def remove_from_queue(self, player_id: str) -> None:
        """Удаляет игрока из очереди"""
        queue = await self.redis.zrange(self.queue_key, 0, -1)
        for item in queue:
            data = json.loads(item)
            if data["id"] == player_id:
                await self.redis.zrem(self.queue_key, item)
                logger.info(f"Игрок {player_id} удален из очереди")
                break
    
    async def find_match(self, rating: int, range: int = 100) -> Optional[List[str]]:
        """Ищет подходящих игроков для матча"""
        now = datetime.now()
        min_rating = max(0, rating - range)
        max_rating = rating + range
        
        # Получаем игроков в диапазоне рейтинга
        players_data = await self.redis.zrangebyscore(
            self.queue_key,
            min_rating,
            max_rating
        )
        
        valid_players = []
        for player_json in players_data:
            player = json.loads(player_json)
            joined_at = datetime.fromisoformat(player["joined_at"])
            
            # Проверяем таймаут
            if now - joined_at > timedelta(seconds=self.player_timeout):
                await self.redis.zrem(self.queue_key, player_json)
                continue
                
            valid_players.append(player["id"])
            
            # Если набралось достаточно игроков
            if len(valid_players) >= 2:
                # Удаляем игроков из очереди
                for p in players_data[:2]:
                    await self.redis.zrem(self.queue_key, p)
                return valid_players[:2]
        
        return None
    
    async def create_game(self, player_ids: List[str]) -> str:
        """Создает новую игру"""
        game_id = await self.redis.incr("game_counter")
        game = GameState()
        
        for player_id in player_ids:
            game.add_player(player_id)
        
        game.status = "waiting"
        game_data = game.to_dict()
        
        # Сохраняем состояние игры
        await self.redis.hset(
            self.games_key,
            game_id,
            json.dumps(game_data)
        )
        
        logger.info(f"Создана игра {game_id} для игроков {player_ids}")
        return str(game_id)
    
    async def get_game_state(self, game_id: str) -> Optional[Dict]:
        """Получает состояние игры"""
        game_data = await self.redis.hget(self.games_key, game_id)
        if game_data:
            return json.loads(game_data)
        return None
    
    async def update_game_state(self, game_id: str, game_state: GameState) -> None:
        """Обновляет состояние игры"""
        await self.redis.hset(
            self.games_key,
            game_id,
            json.dumps(game_state.to_dict())
        )
    
    async def end_game(self, game_id: str) -> None:
        """Завершает игру"""
        await self.redis.hdel(self.games_key, game_id)
        logger.info(f"Игра {game_id} завершена")
    
    async def cleanup_stale_games(self) -> None:
        """Очищает зависшие игры"""
        while True:
            try:
                games = await self.redis.hgetall(self.games_key)
                for game_id, game_data in games.items():
                    game = json.loads(game_data)
                    if game["status"] == "waiting":
                        # Проверяем время создания
                        created_at = datetime.fromisoformat(game.get("created_at", ""))
                        if datetime.now() - created_at > timedelta(minutes=5):
                            await self.end_game(game_id)
            except Exception as e:
                logger.error(f"Ошибка при очистке игр: {e}")
            
            await asyncio.sleep(60)  # Проверяем каждую минуту 