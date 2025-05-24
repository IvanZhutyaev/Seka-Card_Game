import logging
import os
import sys
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError, OperationalError
import redis
from redis.exceptions import RedisError
from config import settings  # Используем наш новый конфиг

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Константы для переподключения
MAX_RETRIES = 5
RETRY_DELAY = 5  # секунд

class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.redis_client = None
        self.initialize_connections()

    def initialize_connections(self):
        """Инициализация подключений к базам данных"""
        # PostgreSQL
        self.engine = create_engine(
            settings.POSTGRES_URL,
            pool_pre_ping=True,  # Проверка соединения перед использованием
            pool_recycle=3600,   # Переподключение каждый час
            pool_size=5,         # Размер пула соединений
            max_overflow=10      # Максимальное количество дополнительных соединений
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        # Redis
        self.redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5,    # Таймаут сокета
            socket_connect_timeout=5,  # Таймаут подключения
            retry_on_timeout=True,     # Повторные попытки при таймауте
            health_check_interval=30   # Проверка здоровья каждые 30 секунд
        )

    def get_db(self):
        """Генератор сессий для FastAPI Depends"""
        db = self.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def get_redis(self):
        """Генератор подключений к Redis"""
        return self.redis_client

    async def check_database_connection(self):
        """Проверка подключений к базам данных при запуске"""
        for attempt in range(MAX_RETRIES):
            try:
                # Проверка PostgreSQL
                conn = self.engine.connect()
                logger.info("✅ PostgreSQL connection successful!")
                conn.close()
                
                # Проверка Redis
                self.redis_client.ping()
                logger.info("✅ Redis connection successful!")
                
                return True
            except (SQLAlchemyError, RedisError) as e:
                logger.error(f"❌ Database connection error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                    time.sleep(RETRY_DELAY)
                    self.initialize_connections()  # Переинициализация подключений
                else:
                    return False

    async def reconnect(self):
        """Принудительное переподключение к базам данных"""
        logger.info("Attempting to reconnect to databases...")
        self.initialize_connections()
        return await self.check_database_connection()

# Создаем глобальный экземпляр менеджера баз данных
db_manager = DatabaseManager()

# Экспортируем функции для использования в других модулях
get_db = db_manager.get_db
get_redis = db_manager.get_redis
check_database_connection = db_manager.check_database_connection
reconnect = db_manager.reconnect

# Проверка подключений при старте
if __name__ == "__main__":
    import asyncio
    
    # Проверка настроек
    logger.info(f"ADMIN_IDS: {settings.ADMIN_IDS}")
    
    # Проверка подключений
    if not asyncio.run(check_database_connection()):
        sys.exit(1)