# Seka Card Game

Онлайн-версия карточной игры "Секка" с поддержкой Telegram WebApp.

## Описание

Это веб-приложение, реализующее карточную игру "Секка" с возможностью игры через Telegram. Игра поддерживает до 6 игроков, систему ставок и чат между игроками.

## Технологии

- Backend: Python 3.9+, FastAPI
- Frontend: React, TypeScript
- База данных: Redis (master-slave)
- WebSocket для real-time коммуникации
- Telegram Bot API
- Docker для контейнеризации

## Требования

- Python 3.9+
- Redis (master-slave)
- Node.js 14+
- Docker (опционально)
- Ngrok (для тестирования)

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/seka-card-game.git
cd seka-card-game
```

2. Установите зависимости Python:
```bash
pip install -r requirements.txt
```

3. Установите зависимости Node.js:
```bash
cd pages
npm install
```

4. Создайте файл конфигурации:
```bash
cp config.example.py config.py
```

5. Настройте переменные окружения:
```bash
# Windows
set TELEGRAM_BOT_TOKEN=your_bot_token
set REDIS_HOST=localhost
set REDIS_PORT=6379
set REDIS_SLAVE_HOST=localhost
set REDIS_SLAVE_PORT=6380
set SERVER_HOST=0.0.0.0
set SERVER_PORT=8080
set WORKERS=4

# Linux/Mac
export TELEGRAM_BOT_TOKEN=your_bot_token
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_SLAVE_HOST=localhost
export REDIS_SLAVE_PORT=6380
export SERVER_HOST=0.0.0.0
export SERVER_PORT=8080
export WORKERS=4
```

## Запуск

### 1. Запуск Redis (Master-Slave)

#### Через Docker:
```bash
# Запуск Redis Master
docker run --name redis-master -p 6379:6379 -d redis

# Запуск Redis Slave
docker run --name redis-slave -p 6380:6379 -d redis redis-server --slaveof redis-master 6379
```

#### Через Redis CLI:
```bash
# На slave сервере
redis-cli -p 6380
> SLAVEOF localhost 6379
```

### 2. Запуск FastAPI сервера

```bash
python server.py
```

### 3. Запуск через Ngrok (для тестирования)

1. Установите Ngrok:
```bash
# Через npm
npm install -g ngrok

# Или скачайте с https://ngrok.com/download
```

2. Запустите Ngrok:
```bash
ngrok http 8080
```

3. Получите URL (например, https://xxxx-xx-xx-xxx-xx.ngrok.io)

4. Обновите URL в настройках Telegram бота:
   - Откройте @BotFather
   - Выберите вашего бота
   - Выберите "Edit Bot" -> "Edit Web App"
   - Установите URL: https://xxxx-xx-xx-xxx-xx.ngrok.io/pages/gameplay/index.html

### 4. Проверка работы

1. Проверьте Redis:
```bash
# Проверка master
redis-cli -p 6379
> INFO replication

# Проверка slave
redis-cli -p 6380
> INFO replication
```

2. Проверьте сервер:
```bash
# Откройте в браузере
http://localhost:8080/pages/gameplay/index.html
```

3. Проверьте Ngrok:
```bash
# Откройте в браузере
https://xxxx-xx-xx-xxx-xx.ngrok.io/pages/gameplay/index.html
```

## Структура проекта

```
seka-card-game/
├── game/                  # Игровая логика
│   ├── engine.py         # Основной движок игры
│   └── models.py         # Модели данных
├── pages/                # Frontend
│   ├── gameplay/        # Игровой интерфейс
│   └── components/      # React компоненты
├── static/              # Статические файлы
├── config.py            # Конфигурация
├── requirements.txt     # Python зависимости
├── server.py           # FastAPI сервер
└── README.md           # Документация
```

## Масштабирование

Проект готов к большим нагрузкам благодаря:
- Redis master-slave для отказоустойчивости
- Асинхронной обработке запросов
- WebSocket для real-time коммуникации
- Контейнеризации через Docker

## Безопасность

- Проверка подлинности данных от Telegram
- Защита WebSocket соединений
- Безопасное хранение состояний в Redis
- CORS настройки

## Лицензия

MIT

## Автор

Ваше имя

