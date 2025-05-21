import psycopg2
from psycopg2 import sql, OperationalError
import logging
from dotenv import load_dotenv
import os
import sys

# Настройка логгирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()


def get_db_config():
    """Возвращает конфигурацию подключения к БД"""
    return {
        'dbname': os.getenv('POSTGRES_DB', 'postgres'),
        'user': os.getenv('POSTGRES_USER', 'postgres'),
        'password': os.getenv('POSTGRES_PASSWORD', ''),
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': os.getenv('POSTGRES_PORT', '5432')
    }


def test_connection(config):
    """Проверяет подключение к серверу PostgreSQL"""
    try:
        conn = psycopg2.connect(
            user=config['user'],
            password=config['password'],
            host=config['host'],
            port=config['port']
        )
        conn.close()
        return True
    except OperationalError as e:
        logger.error(f"Ошибка подключения к PostgreSQL: {e}")
        return False


def create_database(config):
    """Создает базу данных, если она не существует"""
    try:
        # Подключаемся к серверу без указания конкретной базы
        conn = psycopg2.connect(
            user=config['user'],
            password=config['password'],
            host=config['host'],
            port=config['port']
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Проверяем существование базы
        cur.execute(
            sql.SQL("SELECT 1 FROM pg_database WHERE datname = {}").format(
                sql.Literal(config['dbname'])
            )
        )

        if not cur.fetchone():
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(config['dbname'])
                )
            )
            logger.info(f"База данных {config['dbname']} создана")
        else:
            logger.info(f"База данных {config['dbname']} уже существует")

    except Exception as e:
        logger.error(f"Ошибка при создании базы данных: {e}", exc_info=True)
        raise
    finally:
        if conn:
            conn.close()


def create_tables(config):
    """Создает таблицы в базе данных"""
    # Определения таблиц с исправленным синтаксисом
    tables = [
        {
            'name': 'players',
            'ddl': """
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
            """
        },
        {
            'name': 'games',
            'ddl': """
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
                CONSTRAINT valid_status CHECK (status IN ('waiting', 'active', 'finished', 'svara'))
            )
            """
        },
        {
            'name': 'game_players',
            'ddl': """
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
                CONSTRAINT valid_position CHECK (position IN ('left', 'right'))
            )
            """
        },
        {
            'name': 'transactions',
            'ddl': """
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                game_id UUID REFERENCES games(id) ON DELETE SET NULL,
                player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                action VARCHAR(10) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT valid_action CHECK (action IN ('bet', 'win', 'loss', 'fold', 'svara', 'join', 'bluff'))
            )
            """
        }
    ]

    # Определения индексов
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)",
        "CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id)",
        "CREATE INDEX IF NOT EXISTS idx_transactions_game ON transactions(game_id)",
        "CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)",
        "CREATE INDEX IF NOT EXISTS idx_players_telegram ON players(telegram_id)"
    ]

    conn = None
    try:
        conn = psycopg2.connect(**config)
        conn.autocommit = False
        cur = conn.cursor()

        # Создаем таблицы
        for table in tables:
            try:
                # Удаляем лишние пробелы и переносы строк
                clean_ddl = ' '.join(line.strip() for line in table['ddl'].split('\n') if line.strip())
                cur.execute(clean_ddl)
                logger.info(f"Таблица {table['name']} успешно создана/проверена")
            except Exception as e:
                logger.error(f"Ошибка при создании таблицы {table['name']}: {e}\nЗапрос: {clean_ddl}")
                raise

        # Создаем индексы
        for index in indexes:
            try:
                cur.execute(index)
                logger.info(f"Индекс {index.split()[5]} успешно создан/проверен")
            except Exception as e:
                logger.error(f"Ошибка при создании индекса: {e}")
                raise

        conn.commit()
        logger.info("Все таблицы и индексы успешно созданы")

    except Exception as e:
        logger.error(f"Критическая ошибка при создании таблиц: {e}", exc_info=True)
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


def main():
    """Основная функция инициализации БД"""
    try:
        logger.info("Начинаем инициализацию базы данных...")

        db_config = get_db_config()

        if not test_connection(db_config):
            logger.error("Не удалось подключиться к серверу PostgreSQL")
            return

        create_database(db_config)
        create_tables(db_config)

        logger.info("Инициализация базы данных успешно завершена!")
    except Exception as e:
        logger.error(f"Фатальная ошибка при инициализации БД: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()