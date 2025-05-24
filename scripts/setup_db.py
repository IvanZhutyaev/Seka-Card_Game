#!/usr/bin/env python3
"""
Скрипт для настройки базы данных PostgreSQL.
Создает базу данных, пользователя и необходимые таблицы.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

def run_psql_command(command: str) -> bool:
    """Выполняет команду PostgreSQL."""
    try:
        subprocess.run(['psql', '-c', command], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды PostgreSQL: {e}")
        return False

def create_database() -> bool:
    """Создает базу данных и пользователя."""
    db_name = os.getenv('POSTGRES_DB')
    db_user = os.getenv('POSTGRES_USER')
    db_password = os.getenv('POSTGRES_PASSWORD')
    
    if not all([db_name, db_user, db_password]):
        print("Ошибка: не все переменные окружения для базы данных установлены")
        return False
    
    commands = [
        f"CREATE USER {db_user} WITH PASSWORD '{db_password}';",
        f"CREATE DATABASE {db_name} OWNER {db_user};",
        f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO {db_user};",
    ]
    
    for command in commands:
        if not run_psql_command(command):
            return False
    
    return True

def create_tables() -> bool:
    """Создает необходимые таблицы в базе данных."""
    db_name = os.getenv('POSTGRES_DB')
    db_user = os.getenv('POSTGRES_USER')
    
    # Подключение к базе данных
    try:
        subprocess.run(['psql', '-d', db_name, '-U', db_user], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при подключении к базе данных: {e}")
        return False
    
    # SQL-команды для создания таблиц
    commands = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS game_players (
            id SERIAL PRIMARY KEY,
            game_id INTEGER REFERENCES games(id),
            user_id INTEGER REFERENCES users(id),
            score INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(game_id, user_id)
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS game_moves (
            id SERIAL PRIMARY KEY,
            game_id INTEGER REFERENCES games(id),
            user_id INTEGER REFERENCES users(id),
            move_type VARCHAR(50) NOT NULL,
            move_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id SERIAL PRIMARY KEY,
            game_id INTEGER REFERENCES games(id),
            user_id INTEGER REFERENCES users(id),
            message TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
    ]
    
    for command in commands:
        if not run_psql_command(command):
            return False
    
    return True

def create_indexes() -> bool:
    """Создает индексы для оптимизации запросов."""
    commands = [
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
        "CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);",
        "CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);",
        "CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);",
        "CREATE INDEX IF NOT EXISTS idx_game_moves_user_id ON game_moves(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON chat_messages(game_id);",
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);",
    ]
    
    for command in commands:
        if not run_psql_command(command):
            return False
    
    return True

def main() -> None:
    """Основная функция настройки базы данных."""
    print("Настройка базы данных...")
    
    steps = [
        ("Создание базы данных и пользователя", create_database),
        ("Создание таблиц", create_tables),
        ("Создание индексов", create_indexes),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка базы данных завершена успешно!")
        print("\nСозданы следующие таблицы:")
        print("- users: информация о пользователях")
        print("- games: информация об играх")
        print("- game_players: связь между играми и игроками")
        print("- game_moves: ходы в играх")
        print("- chat_messages: сообщения в чате")
    else:
        print("\nНастройка базы данных не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 