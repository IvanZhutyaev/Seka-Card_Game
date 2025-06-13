import logging
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logger = logging.getLogger(__name__)

# --- Настройки подключения ---
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")
DB_NAME = os.getenv("POSTGRES_DB")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
ROOT_DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"

# --- Инициализация SQLAlchemy ---
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_database():
    """Создает базу данных, если она не существует."""
    try:
        root_engine = create_engine(ROOT_DATABASE_URL, isolation_level='AUTOCOMMIT')
        with root_engine.connect() as connection:
            # Проверяем существование базы данных
            result = connection.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'"))
            if result.scalar_one_or_none() is None:
                # Базы данных нет, создаем
                connection.execute(text(f'CREATE DATABASE "{DB_NAME}"'))
                logger.info(f"База данных '{DB_NAME}' успешно создана.")
            else:
                logger.info(f"База данных '{DB_NAME}' уже существует.")
    except OperationalError as e:
        logger.error(f"Не удалось подключиться к PostgreSQL. Проверьте настройки и доступность сервера: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Произошла ошибка при создании базы данных: {e}")
        sys.exit(1)

def create_tables():
    """Создает все таблицы, определенные в Base."""
    try:
        # Импортируем модели здесь, чтобы они были зарегистрированы в Base
        from src import models
        Base.metadata.create_all(bind=engine)
        logger.info("Таблицы успешно созданы/проверены.")
    except Exception as e:
        logger.error(f"Произошла ошибка при создании таблиц: {e}")
        sys.exit(1)