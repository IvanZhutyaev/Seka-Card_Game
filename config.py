from typing import List, Optional
import os
from pydantic import BaseModel, validator
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

# Redis конфигурация
# Вместо текущего REDIS_CONFIG добавьте:
REDIS_CONFIG = {
    'master': {
        'host': os.getenv('REDIS_HOST', 'localhost'),
        'port': int(os.getenv('REDIS_PORT', 6379)),
        'db': 0,
        'decode_responses': True
    },
    'slave': {
        'host': os.getenv('REDIS_SLAVE_HOST', os.getenv('REDIS_HOST', 'localhost')),
        'port': int(os.getenv('REDIS_SLAVE_PORT', os.getenv('REDIS_PORT', 6379))),
        'db': 0,
        'decode_responses': True
    }
}

# Настройки игры
GAME_CONFIG = {
    'min_players': 6,
    'max_players': 6,
    'min_bet': 100,
    'max_bet': 2000,
    'initial_balance': 1000,
    'game_timeout': 300,  # 5 минут на игру
    'player_timeout': 30,  # 30 секунд на ход
}

# Настройки сервера
SERVER_CONFIG = {
    'host': os.getenv('SERVER_HOST', '0.0.0.0'),
    'port': int(os.getenv('SERVER_PORT', 8080)),
    'workers': int(os.getenv('WORKERS', 4)),
    'max_connections': int(os.getenv('MAX_CONNECTIONS', 1000)),
}

# Настройки логирования
LOGGING_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': os.getenv('LOG_FILE', 'game.log'),
}