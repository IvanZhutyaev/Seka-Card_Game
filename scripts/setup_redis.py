#!/usr/bin/env python3
"""
Скрипт для настройки Redis.
Настраивает Redis для использования в качестве кэша и хранилища сессий.
"""

import os
import sys
import subprocess
from typing import List, Dict
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

def run_redis_command(command: str) -> bool:
    """Выполняет команду Redis."""
    try:
        subprocess.run(['redis-cli', command], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды Redis: {e}")
        return False

def configure_redis() -> bool:
    """Настраивает Redis для использования в проекте."""
    redis_password = os.getenv('REDIS_PASSWORD')
    redis_db = os.getenv('REDIS_DB', '0')
    
    if not redis_password:
        print("Ошибка: не установлен пароль для Redis")
        return False
    
    commands = [
        f"AUTH {redis_password}",
        f"SELECT {redis_db}",
        "CONFIG SET maxmemory 256mb",
        "CONFIG SET maxmemory-policy allkeys-lru",
        "CONFIG SET appendonly yes",
        "CONFIG SET appendfilename appendonly.aof",
        "CONFIG SET appendfsync everysec",
        "CONFIG SET save 900 1",
        "CONFIG SET save 300 10",
        "CONFIG SET save 60 10000",
        "CONFIG SET stop-writes-on-bgsave-error yes",
        "CONFIG SET rdbcompression yes",
        "CONFIG SET rdbchecksum yes",
        "CONFIG SET dbfilename dump.rdb",
        "CONFIG SET dir ./",
        "CONFIG SET loglevel notice",
        "CONFIG SET logfile redis.log",
        "CONFIG SET databases 16",
        "CONFIG SET timeout 0",
        "CONFIG SET tcp-keepalive 300",
        "CONFIG SET tcp-backlog 511",
        "CONFIG SET bind 127.0.0.1",
        "CONFIG SET port 6379",
        "CONFIG SET requirepass {redis_password}",
    ]
    
    for command in commands:
        if not run_redis_command(command):
            return False
    
    return True

def test_redis_connection() -> bool:
    """Проверяет подключение к Redis."""
    redis_password = os.getenv('REDIS_PASSWORD')
    
    if not redis_password:
        print("Ошибка: не установлен пароль для Redis")
        return False
    
    try:
        # Проверка подключения
        subprocess.run(['redis-cli', 'PING'], check=True)
        
        # Проверка аутентификации
        subprocess.run(['redis-cli', '-a', redis_password, 'PING'], check=True)
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при проверке подключения к Redis: {e}")
        return False

def setup_redis_persistence() -> bool:
    """Настраивает персистентность Redis."""
    commands = [
        "CONFIG SET appendonly yes",
        "CONFIG SET appendfilename appendonly.aof",
        "CONFIG SET appendfsync everysec",
        "CONFIG SET save 900 1",
        "CONFIG SET save 300 10",
        "CONFIG SET save 60 10000",
    ]
    
    for command in commands:
        if not run_redis_command(command):
            return False
    
    return True

def setup_redis_security() -> bool:
    """Настраивает безопасность Redis."""
    redis_password = os.getenv('REDIS_PASSWORD')
    
    if not redis_password:
        print("Ошибка: не установлен пароль для Redis")
        return False
    
    commands = [
        f"CONFIG SET requirepass {redis_password}",
        "CONFIG SET bind 127.0.0.1",
        "CONFIG SET protected-mode yes",
        "CONFIG SET rename-command FLUSHALL ''",
        "CONFIG SET rename-command FLUSHDB ''",
        "CONFIG SET rename-command CONFIG ''",
        "CONFIG SET rename-command EVAL ''",
    ]
    
    for command in commands:
        if not run_redis_command(command):
            return False
    
    return True

def main() -> None:
    """Основная функция настройки Redis."""
    print("Настройка Redis...")
    
    steps = [
        ("Проверка подключения", test_redis_connection),
        ("Настройка Redis", configure_redis),
        ("Настройка персистентности", setup_redis_persistence),
        ("Настройка безопасности", setup_redis_security),
    ]
    
    success = True
    for step_name, step_func in steps:
        print(f"\n{step_name}...")
        if not step_func():
            print(f"Ошибка при {step_name.lower()}")
            success = False
            break
    
    if success:
        print("\nНастройка Redis завершена успешно!")
        print("\nНастроены следующие параметры:")
        print("- Максимальный размер памяти: 256MB")
        print("- Политика вытеснения: allkeys-lru")
        print("- Персистентность: AOF с синхронизацией каждую секунду")
        print("- Сохранение RDB: каждые 900/300/60 секунд")
        print("- Безопасность: пароль, привязка к localhost")
        print("- Логирование: уровень notice")
    else:
        print("\nНастройка Redis не удалась!")
        sys.exit(1)

if __name__ == '__main__':
    main() 