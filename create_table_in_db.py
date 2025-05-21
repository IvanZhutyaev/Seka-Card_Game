import psycopg2
from psycopg2 import sql
import logging
from dotenv import load_dotenv
import os

# Настройка логгирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()

# Параметры подключения к БД
DB_CONFIG = {
    'dbname': os.getenv('POSTGRES_DB'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD'),
    'host': os.getenv('POSTGRES_HOST'),
    'port': os.getenv('POSTGRES_PORT')
}

def create_database():
    """Создает базу данных, если она не существует"""
    try:
        # Подключаемся к серверу PostgreSQL без указания базы данных
        conn = psycopg2.connect(
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port']
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Проверяем существование базы данных
        cur.execute(
            sql.SQL("SELECT 1 FROM pg_database WHERE datname = {}").format(
                sql.Literal(DB_CONFIG['dbname'])
            )
        )
        
        if not cur.fetchone():
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(DB_CONFIG['dbname'])
                )
            )
            logger.info(f"База данных {DB_CONFIG['dbname']} создана")
        else:
            logger.info(f"База данных {DB_CONFIG['dbname']} уже существует")
            
    except Exception as e:
        logger.error(f"Ошибка при создании базы данных: {e}")
    finally:
        if conn:
            conn.close()

def create_tables():
    """Создает все необходимые таблицы в базе данных"""
    commands = (
        """
        CREATE TABLE IF NOT EXISTS players (
            id BIGINT PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT,
            username TEXT,
            photo_url TEXT,
            balance INTEGER NOT NULL DEFAULT 1000,
            games_played INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            loses INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS games (
            id UUID PRIMARY KEY,
            status VARCHAR(20) NOT NULL,
            deck JSONB,
            table_cards JSONB,
            pot INTEGER NOT NULL DEFAULT 0,
            svara_pot INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP WITH TIME ZONE,
            finished_at TIMESTAMP WITH TIME ZONE,
            CHECK (status IN ('waiting', 'active', 'finished', 'svara'))
        """,
        """
        CREATE TABLE IF NOT EXISTS game_players (
            game_id UUID REFERENCES games(id) ON DELETE CASCADE,
            player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
            cards JSONB,
            bet INTEGER NOT NULL DEFAULT 0,
            folded BOOLEAN NOT NULL DEFAULT FALSE,
            score INTEGER,
            position VARCHAR(10),
            is_turn BOOLEAN DEFAULT FALSE,
            PRIMARY KEY (game_id, player_id),
            CHECK (position IN ('left', 'right'))
        """,
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            game_id UUID REFERENCES games(id) ON DELETE SET NULL,
            player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            action VARCHAR(10) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CHECK (action IN ('bet', 'win', 'loss', 'fold', 'svara', 'join', 'bluff'))
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_transactions_game ON transactions(game_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_players_telegram ON players(telegram_id)
        """
    )
    
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Выполняем все команды по очереди
        for command in commands:
            cur.execute(command)
        
        conn.commit()
        logger.info("Все таблицы успешно созданы")
        
    except Exception as e:
        logger.error(f"Ошибка при создании таблиц: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

def main():
    """Основная функция для создания БД и таблиц"""
    logger.info("Начинаем создание базы данных и таблиц...")
    create_database()
    create_tables()
    logger.info("Готово!")

if __name__ == '__main__':
    main()
