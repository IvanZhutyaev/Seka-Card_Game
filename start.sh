#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Seka Card Game...${NC}"

# Проверка и установка системных зависимостей
echo -e "${YELLOW}Checking system dependencies...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Homebrew not found. Please install Homebrew first.${NC}"
    exit 1
fi

# Установка/обновление необходимых пакетов через brew
echo -e "${YELLOW}Installing/updating system packages...${NC}"
brew install postgresql@14
brew install redis
brew install openssl

# Установка переменных окружения для компиляции
export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib -L/opt/homebrew/opt/postgresql@14/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include -I/opt/homebrew/opt/postgresql@14/include"
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

# Функция для очистки портов
clear_ports() {
    for port in 8000 3000; do
        pid=$(lsof -ti:$port)
        if [ ! -z "$pid" ]; then
            echo -e "${YELLOW}Port $port is in use. Stopping previous process...${NC}"
            kill -9 $pid
            sleep 1
        fi
    done
}

# Проверка наличия Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}Redis not found. Please install Redis first.${NC}"
    exit 1
fi

# Проверка статуса Redis
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    redis-server &
    sleep 2
fi

# Очистка Redis
echo -e "${YELLOW}Clearing Redis cache...${NC}"
redis-cli flushall > /dev/null

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Активация виртуального окружения
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Обновление зависимостей
echo -e "${YELLOW}Updating dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt --upgrade

# Очистка файлов кэша Python
echo -e "${YELLOW}Cleaning Python cache...${NC}"
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null
find . -type f -name "*.pyc" -delete

# Очистка портов перед запуском
clear_ports

# Инициализация базы данных
echo -e "${YELLOW}Initializing database...${NC}"
python3 db.py
python3 create_table_in_db.py

# Запуск серверов и бота
echo -e "${GREEN}Starting servers and bot...${NC}"
python3 webapp.py &  # Запускаем веб-интерфейс в фоновом режиме
sleep 2  # Даем время для инициализации веб-интерфейса
python3 bot.py &     # Запускаем Telegram бота в фоновом режиме
sleep 2  # Даем время для инициализации бота
python3 server.py    # Запускаем игровой сервер

# Сборка React приложения
npm run build

# Запуск Redis
redis-server &
REDIS_PID=$!

# Запуск FastAPI сервера
uvicorn server:app --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!

# Функция для корректного завершения всех процессов
cleanup() {
    echo "Завершение работы..."
    kill $REDIS_PID
    kill $FASTAPI_PID
    deactivate
    exit 0
}

# Перехват сигнала завершения
trap cleanup SIGINT SIGTERM

# Ожидание завершения
wait 