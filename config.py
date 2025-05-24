from typing import List, Optional
import os
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
import logging

# Загружаем переменные окружения вручную
load_dotenv()

class Settings(BaseModel):
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    WEB_APP_URL: str = os.getenv("WEB_APP_URL", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "postgres")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    AVATAR_CACHE_DIR: str = os.getenv("AVATAR_CASH_DIR", "static/avatars")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    ADMIN_IDS: List[int] = []

    @field_validator('ADMIN_IDS', mode='before')
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

    def __init__(self, **data):
        super().__init__(**data)
        # Создаем директорию для аватаров при инициализации
        os.makedirs(self.AVATAR_CACHE_DIR, exist_ok=True)

    @property
    def POSTGRES_URL(self):
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def REDIS_URL(self):
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

# Создаем экземпляр настроек
def get_settings():
    raw_admin_ids = os.getenv("ADMIN_IDS", "")
    return Settings(ADMIN_IDS=raw_admin_ids)

settings = get_settings()

# Настройка логирования
def setup_logging():
    """Настройка унифицированного логирования"""
    # Создаем форматтер
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Настраиваем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Очищаем существующие обработчики
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Добавляем обработчик для консоли
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Добавляем обработчик для файла
    file_handler = logging.FileHandler('app.log')
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)
    
    # Отключаем логирование от сторонних библиотек
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)
    logging.getLogger('websockets').setLevel(logging.WARNING)

# Инициализируем логирование при импорте модуля
setup_logging()

# Создаем логгер для этого модуля
logger = logging.getLogger(__name__)