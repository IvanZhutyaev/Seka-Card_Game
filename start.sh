#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Функция для корректного завершения ---
cleanup() {
    echo -e "\n${RED}Stopping all processes...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID
    fi
    pkill -f "uvicorn src.server:app"
    deactivate
    echo -e "${GREEN}Cleanup complete.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${YELLOW}Starting Seka Card Game...${NC}"

# --- 1. Уничтожаем старые процессы ---
echo -e "${GREEN}Force stopping any old bot or server processes...${NC}"
pkill -f "uvicorn src.server:app"
sleep 1

# --- 2. Настройка Python ---
echo -e "${GREEN}Setting up Python environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# --- 3. Устанавливаем PYTHONPATH ---
export PYTHONPATH=$(pwd)
echo -e "${GREEN}PYTHONPATH set to: $PYTHONPATH${NC}"

# --- 4. Инициализируем БД ---
echo -e "${GREEN}Initializing database...${NC}"
python3 init_db.py

# --- 5. Запускаем приложение ---
echo -e "${GREEN}Starting application...${NC}"
uvicorn src.server:app --host 0.0.0.0 --port 8000 --workers 1 &
SERVER_PID=$!
echo -e "Game Server started with PID ${YELLOW}$SERVER_PID${NC} on port ${YELLOW}8000${NC}"

echo -e "${GREEN}Seka Card Game is running!${NC}"
echo "Press Ctrl+C to stop."

# Ожидаем завершения фонового процесса
wait $SERVER_PID 