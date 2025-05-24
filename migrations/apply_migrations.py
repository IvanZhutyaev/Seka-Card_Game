import os
import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command
from config import settings

# Настройка логирования
logger = logging.getLogger(__name__)

def get_migrations_path():
    """Получение пути к директории с миграциями"""
    return Path(__file__).parent

def get_alembic_config():
    """Создание конфигурации Alembic"""
    migrations_path = get_migrations_path()
    alembic_cfg = Config()
    alembic_cfg.set_main_option("script_location", str(migrations_path))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.POSTGRES_URL)
    return alembic_cfg

def check_migrations_table():
    """Проверка существования таблицы миграций"""
    engine = create_engine(settings.POSTGRES_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("SELECT * FROM alembic_version LIMIT 1"))
            return True
        except Exception:
            return False

def apply_migrations():
    """Применение миграций"""
    try:
        # Проверяем подключение к базе данных
        engine = create_engine(settings.POSTGRES_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Подключение к базе данных успешно")

        # Получаем конфигурацию Alembic
        alembic_cfg = get_alembic_config()

        # Проверяем существование таблицы миграций
        if not check_migrations_table():
            logger.info("Создаем таблицу миграций...")
            command.stamp(alembic_cfg, "head")

        # Получаем текущую версию
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            current_version = result.scalar()
            logger.info(f"Текущая версия базы данных: {current_version}")

        # Применяем миграции
        logger.info("Применяем миграции...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✅ Миграции успешно применены")

    except Exception as e:
        logger.error(f"❌ Ошибка при применении миграций: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migrations() 