from typing import List
import os
from pydantic import BaseModel, validator
from dotenv import load_dotenv

# Загружаем переменные окружения вручную
load_dotenv()


class Settings(BaseModel):
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    WEB_APP_URL: str = os.getenv("WEB_APP_URL", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ADMIN_IDS: List[int] = []

    @validator('ADMIN_IDS', pre=True)
    def parse_admin_ids(cls, v):
        if v is None:
            return []

        if isinstance(v, str):
            # Полностью ручной парсинг без попыток JSON
            v = v.strip().replace('"', '').replace("'", "")
            if not v:
                return []
            return [int(x.strip()) for x in v.split(',') if x.strip().isdigit()]

        return []

    class Config:
        extra = "ignore"

    @property
    def POSTGRES_URL(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}/{self.POSTGRES_DB}"

    @property
    def REDIS_URL(self):
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"


# Создаем экземпляр настроек
def get_settings():
    raw_admin_ids = os.getenv("ADMIN_IDS", "")
    return Settings(ADMIN_IDS=raw_admin_ids)


settings = get_settings()