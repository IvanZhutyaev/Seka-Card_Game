# Seka Card Game

Карточная игра "Сека" в Telegram с веб-интерфейсом.

## Описание

Seka Card Game - это карточная игра, реализованная как Telegram бот с веб-интерфейсом. Игра позволяет пользователям играть в карточную игру "Сека" с другими игроками в реальном времени.

## Технологии

### Бэкенд
- Python 3.8+
- FastAPI
- aiogram 3.x
- PostgreSQL
- Redis
- WebSocket

### Фронтенд
- React
- TypeScript
- Telegram WebApp API

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/seka-card-game.git
cd seka-card-game
```

2. Создайте виртуальное окружение и установите зависимости:
```bash
python -m venv .venv
source .venv/bin/activate  # для Linux/Mac
.venv\Scripts\activate     # для Windows
pip install -r requirements.txt
```

3. Установите зависимости для фронтенда:
```bash
cd pages/gameplay
npm install
```

4. Создайте файл `.env` в корневой директории:
```env
BOT_TOKEN=your_telegram_bot_token
WEB_APP_URL=your_webapp_url
POSTGRES_DB=seka
POSTGRES_USER=seka_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_URL=redis://localhost:6379/0
```

5. Создайте базу данных:
```bash
python create_table_in_db.py
```

## Запуск

1. Запустите бота:
```bash
python bot.py
```

2. Запустите сервер:
```bash
python server.py
```

3. Для разработки фронтенда:
```bash
cd pages/gameplay
npm run dev
```

## Структура проекта

```
seka-card-game/
├── bot.py              # Telegram бот
├── server.py           # FastAPI сервер
├── db.py              # Работа с базами данных
├── config.py          # Конфигурация
├── webapp.py          # Веб-приложение
├── create_table_in_db.py  # Создание таблиц
├── requirements.txt   # Python зависимости
├── pages/            # Фронтенд
│   ├── gameplay/     # Игровой интерфейс
│   │   ├── components/  # React компоненты
│   │   └── store/    # Управление состоянием
│   └── static/       # Статические файлы
├── game/            # Игровая логика
├── migrations/      # Миграции БД
└── templates/       # HTML шаблоны
```

## Основной функционал

### Telegram Бот
- `/start` - запуск игры
- `/reg` - регистрация нового пользователя
- Интеграция с веб-приложением

### Игровой процесс
1. Регистрация через бота
2. Поиск соперника
3. Игровая сессия через веб-интерфейс
4. Сохранение результатов

### Технические особенности
- Real-time коммуникация через WebSocket
- Система матчмейкинга
- Асинхронная обработка
- Интеграция с Telegram WebApp
- Двухфакторная аутентификация

## Разработка

### Требования
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis 6+

### Локальная разработка
1. Установите все зависимости
2. Настройте локальные базы данных
3. Запустите бота и сервер
4. Для разработки фронтенда используйте `npm run dev`

## Лицензия

MIT

## Контакты

- Авторы: Жутяев Иван, Ломовской Артём
- Email: ivan.zhutyaev@mail.ru
- Проект: [https://github.com/IvanZhutyaev/seka-card-game](https://github.com/IvanZhutyaev/seka-card-game)

