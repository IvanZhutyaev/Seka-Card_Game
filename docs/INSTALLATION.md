# Руководство по установке Seka Card Game

## Требования

### Системные требования
- Python 3.8 или выше
- PostgreSQL 12 или выше
- Redis 6 или выше
- Node.js 14 или выше (для сборки фронтенда)
- npm 6 или выше

### Операционные системы
- Linux (Ubuntu 20.04+, Debian 10+)
- macOS 10.15+
- Windows 10/11

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/seka-card-game.git
cd seka-card-game
```

### 2. Настройка виртуального окружения

#### Linux/macOS
```bash
python -m venv venv
source venv/bin/activate
```

#### Windows
```bash
python -m venv venv
.\venv\Scripts\activate
```

### 3. Установка зависимостей

```bash
# Установка Python зависимостей
pip install -r requirements.txt

# Установка зависимостей для разработки
pip install -r requirements-dev.txt

# Установка Node.js зависимостей
npm install
```

### 4. Настройка базы данных

#### PostgreSQL
```bash
# Создание базы данных
createdb seka_game

# Применение миграций
python scripts/init_db.py
```

#### Redis
```bash
# Проверка подключения к Redis
redis-cli ping
```

### 5. Настройка переменных окружения

Создайте файл `.env` в корневой директории проекта:

```env
# Основные настройки
PORT=3000
NODE_ENV=development
DEBUG=true

# База данных
DATABASE_URL=postgresql://user:password@localhost:5432/seka_game
REDIS_URL=redis://localhost:6379

# API
API_KEY=your-secure-api-key-here

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# Метрики
ENABLE_METRICS=true
METRICS_RETENTION_DAYS=7

# Логирование
LOG_LEVEL=debug
LOG_FORMAT=json
```

### 6. Сборка фронтенда

```bash
# Сборка в режиме разработки
npm run build:dev

# Сборка для продакшена
npm run build:prod
```

## Запуск

### Режим разработки

```bash
# Запуск сервера
python server.py

# В отдельном терминале запуск сборки фронтенда
npm run dev
```

### Продакшен режим

```bash
# Запуск с PM2
pm2 start ecosystem.config.js
```

## Проверка установки

1. Откройте браузер и перейдите по адресу `http://localhost:3000`
2. Проверьте логи на наличие ошибок:
```bash
tail -f logs/app.log
```

## Обновление

### Обновление кода
```bash
git pull origin main
pip install -r requirements.txt
npm install
python scripts/init_db.py
```

### Обновление базы данных
```bash
python scripts/migrate_db.py
```

## Устранение неполадок

### Проблемы с базой данных
1. Проверьте подключение:
```bash
psql -d seka_game -c "\l"
```

2. Проверьте миграции:
```bash
python scripts/check_migrations.py
```

### Проблемы с Redis
1. Проверьте статус:
```bash
redis-cli ping
```

2. Проверьте логи:
```bash
tail -f /var/log/redis/redis-server.log
```

### Проблемы с фронтендом
1. Очистите кэш:
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

2. Пересоберите:
```bash
npm run build:prod
```

## Дополнительная информация

- [Документация по API](API.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по разработке](DEVELOPMENT.md)
- [Руководство по тестированию](TESTING.md) 