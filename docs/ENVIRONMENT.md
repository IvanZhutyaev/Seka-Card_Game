# Настройка переменных окружения Seka Card Game

## Содержание
1. [Общие настройки](#общие-настройки)
2. [Настройки базы данных](#настройки-базы-данных)
3. [Настройки Redis](#настройки-redis)
4. [Настройки безопасности](#настройки-безопасности)
5. [Настройки логирования](#настройки-логирования)
6. [Настройки API](#настройки-api)
7. [Настройки Telegram](#настройки-telegram)
8. [Настройки метрик](#настройки-метрик)

## Общие настройки

Создайте файл `.env` в корневой директории проекта:

```env
# Основные настройки
NODE_ENV=production
DEBUG=false
PORT=3000
HOST=0.0.0.0
BASE_URL=https://your-domain.com

# Пути к директориям
STATIC_DIR=/var/www/seka-game/public
TEMPLATES_DIR=/var/www/seka-game/templates
LOGS_DIR=/var/log/seka-game
```

## Настройки базы данных

```env
# PostgreSQL
POSTGRES_DB=seka_game
POSTGRES_USER=seka_user
POSTGRES_PASSWORD=your-secure-password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://seka_user:your-secure-password@localhost:5432/seka_game

# Пул соединений
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE=30000
DB_POOL_ACQUIRE=30000
```

## Настройки Redis

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_URL=redis://:your-redis-password@localhost:6379/0

# Кэширование
CACHE_TTL=3600
CACHE_PREFIX=seka:
```

## Настройки безопасности

```env
# JWT
JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

# API
API_KEY=your-api-key
API_RATE_LIMIT=100
API_RATE_WINDOW=60

# CORS
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
```

## Настройки логирования

```env
# Логирование
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/seka-game/app.log
LOG_MAX_SIZE=100m
LOG_MAX_FILES=14
LOG_COMPRESS=true

# Sentry (опционально)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

## Настройки API

```env
# API версионирование
API_VERSION=v1
API_PREFIX=/api

# Документация
SWAGGER_TITLE=Seka Card Game API
SWAGGER_DESCRIPTION=API documentation for Seka Card Game
SWAGGER_VERSION=1.0.0
SWAGGER_TERMS_OF_SERVICE=https://your-domain.com/terms
SWAGGER_CONTACT_NAME=Your Name
SWAGGER_CONTACT_EMAIL=your-email@example.com
SWAGGER_CONTACT_URL=https://your-domain.com
```

## Настройки Telegram

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook
TELEGRAM_ADMIN_IDS=123456789,987654321
```

## Настройки метрик

```env
# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
PROMETHEUS_PATH=/metrics

# Grafana
GRAFANA_ENABLED=true
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-grafana-password
```

## Проверка настроек

### 1. Проверка файла .env
```bash
# Проверка синтаксиса
python -c "from dotenv import load_dotenv; load_dotenv()"

# Проверка обязательных переменных
python scripts/check_env.py
```

### 2. Проверка подключений
```bash
# Проверка базы данных
python scripts/check_db.py

# Проверка Redis
python scripts/check_redis.py

# Проверка Telegram
python scripts/check_telegram.py
```

## Безопасность

### 1. Защита файла .env
```bash
# Установка прав доступа
chmod 600 .env
chown seka:seka .env
```

### 2. Ротация секретов
```bash
# Генерация новых секретов
python scripts/rotate_secrets.py

# Обновление конфигурации
python scripts/update_config.py
```

## Дополнительная информация

- [Руководство по установке](INSTALLATION.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по запуску](LAUNCH.md)
- [Руководство по разработке](DEVELOPMENT.md)
- [Руководство по тестированию](TESTING.md) 