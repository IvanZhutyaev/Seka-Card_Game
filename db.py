from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import redis
from pydantic import BaseSettings, Field
from typing import List

# Настройки из .env
class Settings(BaseSettings):
    BOT_TOKEN: str
    WEB_APP_URL: str
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str = "localhost"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    DEBUG: bool = False
    ADMIN_IDS: List[int] = Field(default=[], description="ID администраторов через запятую")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def POSTGRES_URL(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}/{self.POSTGRES_DB}"

    @property
    def REDIS_URL(self):
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

settings = Settings()

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