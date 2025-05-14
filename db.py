from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import redis
from .config import settings

# PostgreSQL
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