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
        self.player_games_key = "player_active_games"
        self.min_players = 2  # Минимальное количество игроков
        self.max_players = 6  # Максимальное количество игроков
        self.queue_timeout = 60  # Время ожидания в очереди в секундах
        
    async def add_to_queue(self, player_id: str, rating: int = 1000) -> bool:
        """Добавляет игрока в очередь матчмейкинга"""
        try:
            # Проверяем, не находится ли игрок уже в игре
            active_game = await self.redis.hget(self.player_games_key, player_id)
            if active_game:
                logger.warning(f"Игрок {player_id} уже находится в игре {active_game}")
                return False

            # Проверяем, не находится ли игрок уже в очереди
            queue = await self.redis.zrange(self.queue_key, 0, -1)
            for item in queue:
                data = json.loads(item)
                if data["id"] == player_id:
                    logger.info(f"Игрок {player_id} уже находится в очереди")
                    return True

            # Сохраняем время добавления для таймаута
            player_data = {
                "id": player_id,
                "rating": rating,
                "joined_at": datetime.now().isoformat()
            }
            
            result = await self.redis.zadd(
                self.queue_key,
                {json.dumps(player_data): rating}
            )
            
            if result is None:
                logger.error(f"Не удалось добавить игрока {player_id} в очередь")
                return False
                
            logger.info(f"Игрок {player_id} добавлен в очередь (рейтинг: {rating})")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка при добавлении игрока {player_id} в очередь: {e}")
            return False
    
    async def remove_from_queue(self, player_id: str) -> bool:
        """Удаляет игрока из очереди"""
        try:
            queue = await self.redis.zrange(self.queue_key, 0, -1)
            for item in queue:
                data = json.loads(item)
                if data["id"] == player_id:
                    result = await self.redis.zrem(self.queue_key, item)
                    if result:
                        logger.info(f"Игрок {player_id} удален из очереди")
                        return True
                    else:
                        logger.error(f"Не удалось удалить игрока {player_id} из очереди")
                        return False
            logger.info(f"Игрок {player_id} не найден в очереди")
            return True
        except Exception as e:
            logger.error(f"Ошибка при удалении игрока {player_id} из очереди: {e}")
            return False
    
    async def find_match(self, rating: int = 1000, range: int = 100) -> Optional[List[str]]:
        """Ищет подходящих игроков для матча"""
        try:
            now = datetime.now()
            min_rating = max(0, rating - range)
            max_rating = rating + range
            
            # Получаем игроков в диапазоне рейтинга
            players_data = await self.redis.zrangebyscore(
                self.queue_key,
                min_rating,
                max_rating
            )
            
            if not players_data:
                logger.debug("Нет игроков в очереди в указанном диапазоне рейтинга")
                return None
            
            valid_players = []
            for player_json in players_data:
                try:
                    player = json.loads(player_json)
                    joined_at = datetime.fromisoformat(player["joined_at"])
                    
                    # Проверяем таймаут
                    if now - joined_at > timedelta(seconds=self.player_timeout):
                        await self.redis.zrem(self.queue_key, player_json)
                        logger.info(f"Игрок {player['id']} удален из очереди по таймауту")
                        continue
                    
                    # Проверяем, не находится ли игрок в активной игре
                    active_game = await self.redis.hget(self.player_games_key, player["id"])
                    if active_game:
                        await self.redis.zrem(self.queue_key, player_json)
                        logger.info(f"Игрок {player['id']} удален из очереди (уже в игре)")
                        continue
                        
                    valid_players.append(player["id"])
                    
                    # Если набралось максимальное количество игроков
                    if len(valid_players) >= self.max_players:
                        # Удаляем игроков из очереди
                        for p in players_data[:self.max_players]:
                            await self.redis.zrem(self.queue_key, p)
                        logger.info(f"Найдена группа из {len(valid_players)} игроков для матча")
                        return valid_players[:self.max_players]
                        
                    # Проверяем, можно ли создать игру с текущим количеством игроков
                    if len(valid_players) >= self.min_players:
                        # Проверяем, прошло ли достаточно времени ожидания
                        oldest_player = min(
                            datetime.fromisoformat(json.loads(p)["joined_at"])
                            for p in players_data[:len(valid_players)]
                        )
                        if now - oldest_player > timedelta(seconds=self.queue_timeout):
                            # Удаляем игроков из очереди
                            for p in players_data[:len(valid_players)]:
                                await self.redis.zrem(self.queue_key, p)
                            logger.info(f"Создаем игру с {len(valid_players)} игроками после ожидания")
                            return valid_players
                            
                except Exception as e:
                    logger.error(f"Ошибка при обработке игрока в очереди: {e}")
                    continue
            
            logger.debug(f"Найдено {len(valid_players)} игроков, нужно минимум {self.min_players}")
            return None
            
        except Exception as e:
            logger.error(f"Ошибка при поиске матча: {e}")
            return None
    
    async def create_game(self, player_ids: List[str]) -> Optional[str]:
        """Создает новую игру"""
        try:
            game_id = await self.redis.incr("game_counter")
            game = GameState()
            
            # Добавляем время создания игры
            game.created_at = datetime.now().isoformat()
            
            for player_id in player_ids:
                game.add_player(player_id)
                # Сохраняем связь игрок-игра
                await self.redis.hset(self.player_games_key, player_id, str(game_id))
            
            game.status = "waiting"
            game_data = game.to_dict()
            
            # Сохраняем состояние игры
            result = await self.redis.hset(
                self.games_key,
                game_id,
                json.dumps(game_data)
            )
            
            if result is None:
                logger.error(f"Не удалось сохранить игру {game_id}")
                return None
            
            logger.info(f"Создана игра {game_id} для игроков {player_ids}")
            return str(game_id)
            
        except Exception as e:
            logger.error(f"Ошибка при создании игры: {e}")
            return None
    
    async def get_game_state(self, game_id: str) -> Optional[Dict]:
        """Получает состояние игры"""
        try:
            game_data = await self.redis.hget(self.games_key, game_id)
            if game_data:
                return json.loads(game_data)
            logger.debug(f"Игра {game_id} не найдена")
            return None
        except Exception as e:
            logger.error(f"Ошибка при получении состояния игры {game_id}: {e}")
            return None
    
    async def update_game_state(self, game_id: str, game_state: GameState) -> bool:
        """Обновляет состояние игры"""
        try:
            result = await self.redis.hset(
                self.games_key,
                game_id,
                json.dumps(game_state.to_dict())
            )
            if result is None:
                logger.error(f"Не удалось обновить состояние игры {game_id}")
                return False
            return True
        except Exception as e:
            logger.error(f"Ошибка при обновлении состояния игры {game_id}: {e}")
            return False
    
    async def end_game(self, game_id: str) -> bool:
        """Завершает игру"""
        try:
            # Получаем состояние игры перед удалением
            game_data = await self.redis.hget(self.games_key, game_id)
            if game_data:
                game = json.loads(game_data)
                # Удаляем связи игрок-игра
                for player_id in game.get("players", {}).keys():
                    await self.redis.hdel(self.player_games_key, player_id)
            
            # Удаляем игру
            result = await self.redis.hdel(self.games_key, game_id)
            if result:
                logger.info(f"Игра {game_id} завершена")
                return True
            else:
                logger.warning(f"Игра {game_id} не найдена при попытке завершения")
                return False
        except Exception as e:
            logger.error(f"Ошибка при завершении игры {game_id}: {e}")
            return False
    
    async def cleanup_stale_games(self) -> None:
        """Очищает зависшие игры"""
        while True:
            try:
                games = await self.redis.hgetall(self.games_key)
                for game_id, game_data in games.items():
                    try:
                        game = json.loads(game_data)
                        if game["status"] == "waiting":
                            # Проверяем время создания
                            created_at = datetime.fromisoformat(game.get("created_at", ""))
                            if datetime.now() - created_at > timedelta(minutes=5):
                                await self.end_game(game_id)
                                logger.info(f"Удалена зависшая игра {game_id}")
                    except Exception as e:
                        logger.error(f"Ошибка при обработке игры {game_id}: {e}")
                        continue
            except Exception as e:
                logger.error(f"Ошибка при очистке игр: {e}")
            
            await asyncio.sleep(60)  # Проверяем каждую минуту 