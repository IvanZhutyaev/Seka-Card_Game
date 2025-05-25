# Руководство по установке и запуску Seka Card Game

## Требования

### Системные требования
- Python 3.8 или выше
- Node.js 16 или выше
- PostgreSQL 12 или выше
- Redis 6 или выше

### Установка системных зависимостей

#### Windows
1. Установите Python с [python.org](https://www.python.org/downloads/)
2. Установите Node.js с [nodejs.org](https://nodejs.org/)
3. Установите PostgreSQL с [postgresql.org](https://www.postgresql.org/download/windows/)
4. Установите Redis через WSL или используйте [Redis для Windows](https://github.com/microsoftarchive/redis/releases)

#### Linux (Ubuntu/Debian)
```bash
# Python
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Redis
sudo apt install redis-server
```

#### macOS
```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python
brew install python

# Node.js
brew install node

# PostgreSQL
brew install postgresql

# Redis
brew install redis
```

## Установка проекта

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/seka-card-game.git
cd seka-card-game
```

2. Создайте и активируйте виртуальное окружение Python:
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/macOS
python3 -m venv .venv
source .venv/bin/activate
```

3. Установите Python зависимости:
```bash
pip install -r requirements.txt
```

4. Установите зависимости для фронтенда:
```bash
cd pages/gameplay
npm install
cd ../..
```

## Настройка окружения

1. Создайте файл `.env` в корневой директории проекта:
```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token
WEB_APP_URL=your_webapp_url

# Database
POSTGRES_DB=seka
POSTGRES_USER=seka_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Debug mode (опционально)
DEBUG=False

# Admin IDs (опционально)
ADMIN_IDS=123456789,987654321
```

2. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE seka;
CREATE USER seka_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE seka TO seka_user;
```

3. Создайте таблицы в базе данных:
```bash
python create_table_in_db.py
```

## Запуск проекта

1. Запустите Redis сервер:
```bash
# Windows (WSL)
redis-server

# Linux/macOS
sudo service redis-server start
# или
redis-server
```

2. Запустите бота (в отдельном терминале):
```bash
python bot.py
```

3. Запустите сервер (в отдельном терминале):
```bash
python server.py
```

4. Для разработки фронтенда (в отдельном терминале):
```bash
cd pages/gameplay
npm run dev
```

## Проверка работоспособности

1. Откройте Telegram и найдите вашего бота
2. Отправьте команду `/reg` для регистрации
3. Отправьте команду `/start` для начала игры
4. Нажмите на кнопку "🎮 Играть в Сека"

## Устранение неполадок

### Ошибка подключения к PostgreSQL
- Проверьте, что PostgreSQL запущен
- Проверьте правильность данных в `.env`
- Проверьте права доступа пользователя

### Ошибка подключения к Redis
- Проверьте, что Redis запущен
- Проверьте правильность HOST и PORT в `.env`
- Проверьте доступность порта 6379

### Ошибка запуска бота
- Проверьте правильность BOT_TOKEN
- Проверьте, что бот создан через @BotFather

### Ошибка WebSocket
- Проверьте, что WEB_APP_URL правильно настроен
- Проверьте, что сервер доступен по указанному URL

### Ошибки фронтенда
- Проверьте, что все npm зависимости установлены
- Проверьте консоль браузера на наличие ошибок

## Мониторинг

### Логи
- Логи бота и сервера выводятся в консоль
- Дополнительные логи сохраняются в `app.log`

### Проверка состояния баз данных
```bash
# PostgreSQL
psql -U seka_user -d seka

# Redis
redis-cli ping
```

## Разработка

### Структура проекта
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

### Команды для разработки
```bash
# Запуск в режиме разработки
python server.py --reload

# Сборка фронтенда
cd pages/gameplay
npm run build

# Проверка типов
cd pages/gameplay
npm run type-check
``` 