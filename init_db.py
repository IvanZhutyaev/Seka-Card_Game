import os
import sys
import logging

# Добавляем корень проекта в PYTHONPATH, чтобы можно было импортировать из src
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.db import create_database, create_tables

# Настройка логирования для скрипта
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

if __name__ == "__main__":
    logging.info("Starting database initialization...")
    try:
        create_database()
        create_tables()
        logging.info("Database initialization completed successfully.")
    except Exception as e:
        logging.error(f"An error occurred during database initialization: {e}", exc_info=True)
        sys.exit(1) 