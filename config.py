from typing import List, Optional
import os
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
import logging
from pydantic_settings import BaseSettings

# Загружаем переменные окружения вручную
load_dotenv()


class Settings(BaseSettings):
    # Основные настройки
    BOT_TOKEN: str
    ADMIN_IDS: List[int]
    WEBHOOK_URL: Optional[str] = None
    
    # База данных
    POSTGRES_URL: str
    REDIS_URL: str
    
    # Настройки логирования
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_DATE_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    
    # Настройки игры
    MIN_BET: int = 10
    MAX_BET: int = 1000
    STARTING_BALANCE: int = 1000
    
    class Config:
        env_file = ".env"

    def validate_settings(self):
        """Проверка обязательных настроек"""
        required_settings = {
            "BOT_TOKEN": self.BOT_TOKEN,
            "ADMIN_IDS": self.ADMIN_IDS,
            "POSTGRES_URL": self.POSTGRES_URL,
            "REDIS_URL": self.REDIS_URL
        }
        
        missing_settings = []
        for name, value in required_settings.items():
            if not value:
                missing_settings.append(name)
        
        if missing_settings:
            raise ValueError(
                f"Отсутствуют обязательные настройки: {', '.join(missing_settings)}"
            )
        
        # Проверка формата URL
        if not self.POSTGRES_URL.startswith(("postgresql://", "postgres://")):
            raise ValueError("Некорректный формат URL для PostgreSQL")
        
        if not self.REDIS_URL.startswith(("redis://", "rediss://")):
            raise ValueError("Некорректный формат URL для Redis")
        
        # Проверка значений
        if self.MIN_BET <= 0:
            raise ValueError("MIN_BET должен быть положительным числом")
        
        if self.MAX_BET <= self.MIN_BET:
            raise ValueError("MAX_BET должен быть больше MIN_BET")
        
        if self.STARTING_BALANCE <= 0:
            raise ValueError("STARTING_BALANCE должен быть положительным числом")

# Создаем экземпляр настроек
settings = Settings()

# Проверяем настройки
try:
    settings.validate_settings()
    logger.info("✅ Все настройки успешно загружены и проверены")
except ValueError as e:
    logger.error(f"❌ Ошибка в настройках: {e}")
    raise

# Настройка логирования
def setup_logging():
    """Настройка унифицированного логирования"""
    # Создаем форматтер
    formatter = logging.Formatter(
        fmt=settings.LOG_FORMAT,
        datefmt=settings.LOG_DATE_FORMAT
    )
    
    # Настраиваем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)
    
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