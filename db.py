import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import redis
from config import settings  # Используем наш новый конфиг

# Настройка логирования
logging.basicConfig(level=logging.INFO)

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


# Проверка подключений при старте
if __name__ == "__main__":
    # Проверка настроек
    print("ADMIN_IDS:", settings.ADMIN_IDS)

    # Проверка подключения к PostgreSQL
    try:
        conn = engine.connect()
        print("✅ PostgreSQL connection successful!")
        conn.close()
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")

    # Проверка подключения к Redis
    try:
        redis_client.ping()
        print("✅ Redis connection successful!")
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")