#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting development server...${NC}"

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

# Проверка Redis
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    redis-server &
    sleep 2
fi

# Активация виртуального окружения
source venv/bin/activate

# Обновление зависимостей
echo -e "${YELLOW}Updating dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt --upgrade

# Установка nodemon если его нет
if ! command -v nodemon &> /dev/null; then
    echo -e "${YELLOW}Installing nodemon...${NC}"
    npm install -g nodemon
fi

# Очистка Redis
echo -e "${YELLOW}Clearing Redis cache...${NC}"
redis-cli flushall > /dev/null

# Очистка портов перед запуском
clear_ports

# Инициализация базы данных
echo -e "${YELLOW}Initializing database...${NC}"
python3 db.py
python3 create_table_in_db.py

# Запуск серверов и бота с автоперезагрузкой
echo -e "${GREEN}Starting servers and bot with auto-reload...${NC}"
nodemon --exec python3 webapp.py --ext py,js,html,css --ignore __pycache__/ --ignore venv/ --delay 1 &
sleep 2  # Даем время для инициализации веб-интерфейса
nodemon --exec python3 bot.py --ext py --ignore __pycache__/ --ignore venv/ --delay 1 &
sleep 2  # Даем время для инициализации бота
nodemon --exec python3 server.py --ext py,js,html,css --ignore __pycache__/ --ignore venv/ --delay 1