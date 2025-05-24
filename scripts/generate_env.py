#!/usr/bin/env python3
"""
Скрипт для генерации файла .env с переменными окружения.
Создает файл .env на основе шаблона с безопасными значениями по умолчанию.
"""

import os
import secrets
import string
from typing import Dict, List

# Шаблон переменных окружения
ENV_TEMPLATE = """# Основные настройки
NODE_ENV=development
DEBUG=true
PORT=3000
HOST=localhost
BASE_URL=http://localhost:3000

# Директории
STATIC_DIR=static
TEMPLATES_DIR=templates
LOGS_DIR=logs

# База данных
POSTGRES_DB=seka_game
POSTGRES_USER={db_user}
POSTGRES_PASSWORD={db_password}
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://{db_user}:{db_password}@localhost:5432/seka_game
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD={redis_password}
REDIS_DB=0
REDIS_URL=redis://:{redis_password}@localhost:6379/0
CACHE_TTL=3600
CACHE_PREFIX=seka_game:

# Безопасность
JWT_SECRET={jwt_secret}
JWT_ALGORITHM=HS256
JWT_EXPIRATION=86400
API_KEY={api_key}
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
API_RATE_LIMIT=100
API_RATE_WINDOW=3600

# Логирование
LOG_LEVEL=info
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s
LOG_FILE=logs/app.log

# API
API_VERSION=v1
API_PREFIX=/api/v1
API_DOCS_URL=/docs
API_REDOC_URL=/redoc

# Telegram
TELEGRAM_BOT_TOKEN={telegram_token}
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram
TELEGRAM_ADMIN_IDS=123456789,987654321

# Метрики
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics
"""

def generate_password(length: int = 32) -> str:
    """Генерирует случайный пароль заданной длины."""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_telegram_token() -> str:
    """Генерирует случайный токен для Telegram бота."""
    return secrets.token_hex(16)

def main() -> None:
    """Основная функция генерации .env файла."""
    # Генерация безопасных значений
    values = {
        'db_user': 'seka_game_user',
        'db_password': generate_password(),
        'redis_password': generate_password(),
        'jwt_secret': generate_password(),
        'api_key': generate_password(),
        'telegram_token': generate_telegram_token(),
    }
    
    # Создание директории для логов, если она не существует
    os.makedirs('logs', exist_ok=True)
    
    # Генерация .env файла
    env_content = ENV_TEMPLATE.format(**values)
    
    # Запись в файл
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("Файл .env успешно создан!")
    print("\nСгенерированные значения:")
    for key, value in values.items():
        print(f"{key}: {value}")
    
    print("\nВНИМАНИЕ: Сохраните эти значения в надежном месте!")
    print("Они понадобятся для настройки базы данных и других сервисов.")

if __name__ == '__main__':
    main() 