#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Starting Seka Card Game Development Server...${NC}"

# --- Dependency and Environment Setup ---

# Function to check and install brew packages
install_brew_package() {
    if ! brew list $1 &>/dev/null; then
        echo -e "${YELLOW}Installing $1...${NC}"
        brew install $1
    fi
}

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Homebrew not found. Please install Homebrew first.${NC}"
    exit 1
fi

# Check and install system dependencies
install_brew_package "postgresql@14"
install_brew_package "redis"
install_brew_package "openssl@3"
install_brew_package "jq"
install_brew_package "ngrok"

# Set environment for compilers
export LDFLAGS="-L/opt/homebrew/opt/openssl@3/lib -L/opt/homebrew/opt/postgresql@14/lib"
export CPPFLAGS="-I/opt/homebrew/opt/openssl@3/include -I/opt/homebrew/opt/postgresql@14/include"
export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"

# Start Redis if not running
if ! redis-cli ping &> /dev/null; then
    echo -e "${YELLOW}Starting Redis...${NC}"
    brew services start redis
    sleep 2 # Give it a moment to start
fi

# Activate Python virtual environment
source venv/bin/activate

# Update Python dependencies
echo -e "${YELLOW}Updating Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# --- Database and Cache ---

# Initialize database
echo -e "${GREEN}Initializing database...${NC}"
python3 db.py
python3 create_table_in_db.py
echo -e "${GREEN}Database initialized.${NC}"

# Clear Redis cache
echo -e "${GREEN}Clearing Redis cache...${NC}"
redis-cli FLUSHALL

# --- Ngrok and Webapp URL ---

# # Load environment variables from .env file
# if [ -f .env ]; then
#     export $(grep -v '^#' .env | xargs)
# fi

# # Start ngrok and get public URL
# echo -e "${YELLOW}Starting ngrok for the webapp (port 8080)...${NC}"
# ngrok http 8080 --log=stdout > ngrok.log &
# NGROK_PID=$!
# sleep 5 # Give ngrok time to start and create the tunnel

# # Fetch the ngrok public URL
# NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[] | select(.proto=="https") | .public_url')

# if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" == "null" ]; then
#     echo -e "${RED}Failed to get ngrok URL. Please check ngrok status.${NC}"
#     kill $NGROK_PID
#     exit 1
# fi

# echo -e "${GREEN}ngrok is running at: ${NGROK_URL}${NC}"

# # Update WEB_APP_URL in .env file and export it
# sed -i.bak "s|^WEB_APP_URL=.*|WEB_APP_URL=${NGROK_URL}|" .env
# rm .env.bak
# export WEB_APP_URL=$NGROK_URL

# # Set Telegram Webhook
# echo -e "${YELLOW}Setting Telegram bot webhook...${NC}"
# curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEB_APP_URL}" > /dev/null
# echo -e "${GREEN}Webhook set.${NC}"

# --- Application Startup ---

# Start React development server in the background
echo -e "${YELLOW}Starting frontend development server (React)...${NC}"
(cd pages/gameplay && BROWSER=none npm start) &
FRONTEND_PID=$!
sleep 10 # Give React dev server time to start

# # Open ngrok URL in default browser
# open "${NGROK_URL}"

# Install nodemon if not present
if ! command -v nodemon &> /dev/null; then
    echo -e "${YELLOW}Installing nodemon...${NC}"
    npm install -g nodemon
fi

# Start services in the background
echo -e "${GREEN}Starting backend services...${NC}"
python3 server.py &
SERVER_PID=$!
python3 bot.py &
BOT_PID=$!

# echo -e "${GREEN}ngrok is running at: ${NGROK_URL}${NC}"

# Cleanup function to stop all services
cleanup() {
    echo -e "\n${YELLOW}Stopping all processes...${NC}"
    
    # Kill all services
    kill $SERVER_PID $BOT_PID $FRONTEND_PID $NGROK_PID &>/dev/null
    
    # Stop Redis service
    brew services stop redis > /dev/null

    # Deactivate python environment
    deactivate
    
    echo -e "${RED}All processes stopped. Environment cleaned up.${NC}"
    exit 0
}

# Trap exit signals to run cleanup
trap cleanup SIGINT SIGTERM EXIT

# Use nodemon to watch for file changes and restart services
echo -e "${GREEN}Watching for file changes...${NC}"
nodemon --watch . --ext "py,js,ts,tsx,html,css,json" --ignore "build/" --ignore "venv/" --ignore "*.log" --exec "echo 'Changes detected, restarting services...' && kill $SERVER_PID $BOT_PID && python3 server.py & SERVER_PID=$! && python3 bot.py & BOT_PID=$!"

# Wait indefinitely, script will be terminated by trap
wait