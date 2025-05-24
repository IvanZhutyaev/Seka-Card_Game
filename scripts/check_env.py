#!/usr/bin/env python3
"""
Скрипт для проверки переменных окружения.
Проверяет наличие и корректность всех необходимых переменных окружения.
"""

import os
import sys
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Обязательные переменные окружения
REQUIRED_VARS = {
    # Основные настройки
    'NODE_ENV': str,
    'PORT': int,
    'HOST': str,
    'BASE_URL': str,
    
    # База данных
    'POSTGRES_DB': str,
    'POSTGRES_USER': str,
    'POSTGRES_PASSWORD': str,
    'POSTGRES_HOST': str,
    'POSTGRES_PORT': int,
    'DATABASE_URL': str,
    
    # Redis
    'REDIS_HOST': str,
    'REDIS_PORT': int,
    'REDIS_PASSWORD': str,
    'REDIS_DB': int,
    'REDIS_URL': str,
    
    # Безопасность
    'JWT_SECRET': str,
    'JWT_ALGORITHM': str,
    'JWT_EXPIRATION': int,
    'API_KEY': str,
    
    # Логирование
    'LOG_LEVEL': str,
    'LOG_FORMAT': str,
    'LOG_FILE': str,
}

# Опциональные переменные окружения
OPTIONAL_VARS = {
    'DEBUG': bool,
    'DB_POOL_MIN': int,
    'DB_POOL_MAX': int,
    'CACHE_TTL': int,
    'CACHE_PREFIX': str,
    'API_RATE_LIMIT': int,
    'API_RATE_WINDOW': int,
    'SENTRY_DSN': str,
    'TELEGRAM_BOT_TOKEN': str,
    'TELEGRAM_WEBHOOK_URL': str,
    'PROMETHEUS_ENABLED': bool,
    'GRAFANA_ENABLED': bool,
}

def check_type(value: str, expected_type: type) -> bool:
    """Проверяет, соответствует ли значение ожидаемому типу."""
    try:
        if expected_type == bool:
            return value.lower() in ('true', 'false', '1', '0', 'yes', 'no')
        expected_type(value)
        return True
    except (ValueError, TypeError):
        return False

def check_required_vars() -> List[str]:
    """Проверяет наличие и корректность обязательных переменных."""
    errors = []
    for var_name, var_type in REQUIRED_VARS.items():
        value = os.getenv(var_name)
        if value is None:
            errors.append(f"Отсутствует обязательная переменная: {var_name}")
        elif not check_type(value, var_type):
            errors.append(f"Неверный тип для переменной {var_name}: ожидается {var_type.__name__}")
    return errors

def check_optional_vars() -> List[str]:
    """Проверяет корректность опциональных переменных, если они установлены."""
    errors = []
    for var_name, var_type in OPTIONAL_VARS.items():
        value = os.getenv(var_name)
        if value is not None and not check_type(value, var_type):
            errors.append(f"Неверный тип для переменной {var_name}: ожидается {var_type.__name__}")
    return errors

def check_urls() -> List[str]:
    """Проверяет корректность URL-адресов."""
    errors = []
    urls = ['BASE_URL', 'DATABASE_URL', 'REDIS_URL', 'TELEGRAM_WEBHOOK_URL']
    for url_var in urls:
        value = os.getenv(url_var)
        if value and not value.startswith(('http://', 'https://', 'postgresql://', 'redis://')):
            errors.append(f"Некорректный URL в переменной {url_var}")
    return errors

def check_paths() -> List[str]:
    """Проверяет существование указанных путей."""
    errors = []
    paths = ['LOG_FILE']
    for path_var in paths:
        path = os.getenv(path_var)
        if path:
            dir_path = os.path.dirname(path)
            if not os.path.exists(dir_path):
                errors.append(f"Директория не существует: {dir_path}")
    return errors

def main() -> None:
    """Основная функция проверки окружения."""
    print("Проверка переменных окружения...")
    
    # Сбор всех ошибок
    errors = []
    errors.extend(check_required_vars())
    errors.extend(check_optional_vars())
    errors.extend(check_urls())
    errors.extend(check_paths())
    
    # Вывод результатов
    if errors:
        print("\nНайдены ошибки:")
        for error in errors:
            print(f"- {error}")
        sys.exit(1)
    else:
        print("\nВсе проверки пройдены успешно!")
        sys.exit(0)

if __name__ == '__main__':
    main() 