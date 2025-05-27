class Game {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.isMyTurn = false;
        this.gameState = {
            status: 'waiting',
            round: 'dealing',
            bank: 0,
            current_bet: 0,
            players: {}
        };
        
        this.setupLogger();
        
        // Инициализация Telegram WebApp
        if (window.Telegram?.WebApp) {
            this.log('Telegram WebApp found, initializing...');
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            const webAppUser = window.Telegram.WebApp.initDataUnsafe?.user;
            this.log('WebApp user data:', webAppUser);
            
            if (webAppUser) {
                this.playerId = webAppUser.id.toString();
                this.log('Player ID initialized: ' + this.playerId);
            } else {
                this.log('Failed to get user data from Telegram WebApp', 'error');
            }
        } else {
            this.log('Telegram WebApp not available', 'error');
        }
        
        this.initWebSocket();
        this.initEventListeners();
    }
    
    setupLogger() {
        // Создаем контейнер для логов
        const logContainer = document.createElement('div');
        logContainer.id = 'game-logs';
        logContainer.style.cssText = `
            position: fixed;
            bottom: 70px;
            left: 10px;
            right: 10px;
            max-height: 150px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
        `;
        document.body.appendChild(logContainer);

        // Добавляем кнопку очистки логов
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Очистить логи';
        clearButton.style.cssText = `
            position: fixed;
            bottom: 230px;
            right: 10px;
            padding: 5px 10px;
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            z-index: 1000;
        `;
        clearButton.onclick = () => this.clearLogs();
        document.body.appendChild(clearButton);
    }
    
    log(message, type = 'info') {
        const logContainer = document.getElementById('game-logs');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();
        logEntry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        logEntry.style.padding = '2px 0';
        
        switch(type) {
            case 'error':
                logEntry.style.color = '#ff4444';
                break;
            case 'success':
                logEntry.style.color = '#44ff44';
                break;
            case 'warning':
                logEntry.style.color = '#ffff44';
                break;
            default:
                logEntry.style.color = '#ffffff';
        }
        
        logEntry.textContent = `[${timestamp}] ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    clearLogs() {
        const logContainer = document.getElementById('game-logs');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }
    
    initWebSocket() {
        if (!this.playerId) {
            this.log('Player ID not initialized', 'error');
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const initData = params.get('initData');
        const hash = params.get('hash');
        
        if (!initData || !hash) {
            this.log('Missing initialization data', 'error');
            return;
        }
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/${this.playerId}?initData=${initData}&hash=${hash}`;
        this.log('Connecting to WebSocket: ' + wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.log('WebSocket connected', 'success');
            this.findNewGame();
        };
        
        this.ws.onmessage = (event) => {
            this.log('Received message: ' + event.data);
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            this.log('WebSocket disconnected', 'warning');
            this.showError('Соединение потеряно');
        };
        
        this.ws.onerror = (error) => {
            this.log('WebSocket error: ' + error, 'error');
            this.showError('Ошибка соединения');
        };
    }
    
    initEventListeners() {
        document.getElementById('fold-btn').addEventListener('click', () => this.fold());
        document.getElementById('bet-btn').addEventListener('click', () => this.placeBet());
    }
    
    handleMessage(data) {
        this.log('Handling message: ' + JSON.stringify(data));
        switch (data.type) {
            case 'game_state':
                this.gameState = data.state;
                this.gameId = data.game_id;
                this.log('Game state updated. Game ID: ' + this.gameId);
                this.updateGameState(data.state);
                if (data.balance !== undefined) {
                    this.updateBalance(data.balance);
                }
                break;
                
            case 'game_over':
                this.log('Game over. Winner: ' + data.winner);
                this.handleGameOver(data);
                break;
                
            case 'error':
                this.log('Received error: ' + data.message, 'error');
                this.showError(data.message);
                break;
        }
    }
    
    updateGameState(state) {
        // Обновляем банк и текущую ставку
        document.querySelector('#bank span').textContent = state.bank;
        document.querySelector('#current-bet span').textContent = state.current_bet;
        
        // Обновляем карты игрока
        const playerCards = document.getElementById('player-cards');
        playerCards.innerHTML = '';
        
        if (state.players[this.playerId]?.cards) {
            state.players[this.playerId].cards.forEach(card => {
                playerCards.appendChild(this.createCardElement(card));
            });
        }
        
        // Обновляем состояние кнопок
        this.isMyTurn = state.current_turn === this.playerId;
        const isBiddingRound = state.round === 'bidding';
        
        document.getElementById('fold-btn').disabled = !this.isMyTurn || !isBiddingRound;
        document.getElementById('bet-btn').disabled = !this.isMyTurn || !isBiddingRound;
        document.getElementById('bet-amount').disabled = !this.isMyTurn || !isBiddingRound;
        
        if (this.isMyTurn && isBiddingRound) {
            document.getElementById('bet-amount').min = state.current_bet || 100;
        }
        
        // Если игра в состоянии showdown, показываем карты всех игроков
        if (state.round === 'showdown') {
            this.showAllCards(state);
        }
    }
    
    handleGameOver(data) {
        const winner = data.winner;
        const state = data.state;
        
        // Показываем карты всех игроков
        this.showAllCards(state);
        
        // Показываем сообщение о победителе
        const message = winner === this.playerId ? 
            `Поздравляем! Вы выиграли ${state.bank}₽` :
            `Игрок ${winner} выиграл ${state.bank}₽`;
            
        this.showMessage(message);
        
        // Обновляем баланс победителя
        if (data.balance !== undefined && winner === this.playerId) {
            this.updateBalance(data.balance);
        }
        
        // Через 5 секунд предлагаем начать новую игру
        setTimeout(() => {
            if (confirm('Хотите сыграть еще раз?')) {
                this.findNewGame();
            }
        }, 5000);
    }
    
    showAllCards(state) {
        const opponentArea = document.getElementById('opponent-area');
        opponentArea.innerHTML = '';
        
        Object.entries(state.players).forEach(([pid, player]) => {
            if (pid !== this.playerId) {
                const playerElement = document.createElement('div');
                playerElement.className = 'opponent';
                
                const cards = document.createElement('div');
                cards.className = 'cards';
                
                player.cards.forEach(card => {
                    cards.appendChild(this.createCardElement(card));
                });
                
                playerElement.appendChild(cards);
                opponentArea.appendChild(playerElement);
            }
        });
    }
    
    createCardElement(card) {
        const element = document.createElement('div');
        element.className = 'card';
        element.textContent = `${card.rank}${card.suit}`;
        if (card.is_joker) {
            element.classList.add('joker');
        }
        return element;
    }
    
    placeBet() {
        this.log('Attempting to place bet...');
        this.log('Game state:', this.gameState);
        this.log('Player ID:', this.playerId);
        this.log('Game ID:', this.gameId);
        
        if (!this.isMyTurn) {
            this.log('Сейчас не ваш ход', 'error');
            this.showError('Сейчас не ваш ход');
            return;
        }
        
        if (!this.gameId) {
            this.log('ID игры не инициализирован', 'error');
            this.showError('ID игры не инициализирован');
            return;
        }
        
        const amount = parseInt(document.getElementById('bet-amount').value);
        if (isNaN(amount) || amount < 100 || amount > 2000) {
            this.log('Некорректная сумма ставки: ' + amount, 'error');
            this.showError('Некорректная сумма ставки');
            return;
        }
        
        const message = {
            type: 'game_action',
            game_id: this.gameId,
            action: 'bet',
            amount: amount
        };
        
        this.log('Sending bet message:', message);
        this.ws.send(JSON.stringify(message));
    }
    
    fold() {
        if (!this.isMyTurn) return;
        
        this.ws.send(JSON.stringify({
            type: 'game_action',
            game_id: this.gameId,
            action: 'fold'
        }));
    }
    
    findNewGame() {
        this.ws.send(JSON.stringify({
            type: 'find_game'
        }));
    }
    
    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.body.appendChild(errorElement);
        
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }
    
    showMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'game-message';
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
    
    updateBalance(balance) {
        const balanceElement = document.querySelector('.balance');
        if (balanceElement) {
            balanceElement.textContent = `${balance}₽`;
        }
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    new Game();
}); 