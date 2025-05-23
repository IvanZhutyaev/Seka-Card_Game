import logging
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import redis
from config import settings  # Используем наш новый конфиг

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQLAlchemy
Base = declarative_base()
engine = create_engine(settings.POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Генератор сессий для FastAPI Depends"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Redis
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis():
    """Генератор подключений к Redis"""
    return redis_client


async def check_database_connection():
    """Проверка подключений к базам данных при запуске"""
    try:
        # Проверка PostgreSQL
        conn = engine.connect()
        logger.info("✅ PostgreSQL connection successful!")
        conn.close()
        
        # Проверка Redis
        redis_client.ping()
        logger.info("✅ Redis connection successful!")
        
        return True
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return False


# Проверка подключений при старте
if __name__ == "__main__":
    import asyncio
    
    # Проверка настроек
    logger.info(f"ADMIN_IDS: {settings.ADMIN_IDS}")
    
    # Проверка подключений
    if not asyncio.run(check_database_connection()):
        sys.exit(1)