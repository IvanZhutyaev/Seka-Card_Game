class Game {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.isMyTurn = false;
        this.userData = null;
        
        // Инициализация Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Получаем данные пользователя
            this.userData = window.Telegram.WebApp.initDataUnsafe.user;
            this.playerId = this.userData?.id;
            
            // Добавляем информацию о пользователе
            this.addUserInfo();
        }
        
        this.initWebSocket();
        this.initEventListeners();
    }
    
    addUserInfo() {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        // Добавляем аватар
        if (this.userData.photo_url) {
            const avatar = document.createElement('img');
            avatar.src = this.userData.photo_url;
            avatar.className = 'user-avatar';
            userInfo.appendChild(avatar);
        }
        
        // Добавляем имя
        const name = document.createElement('div');
        name.className = 'user-name';
        name.textContent = this.userData.first_name;
        userInfo.appendChild(name);
        
        // Добавляем в DOM
        document.getElementById('player-area').prepend(userInfo);
    }
    
    initWebSocket() {
        this.ws = new WebSocket(`ws://${window.location.host}/ws/${this.playerId}`);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.findGame();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Пробуем переподключиться через 5 секунд
            setTimeout(() => this.initWebSocket(), 5000);
        };
    }
    
    initEventListeners() {
        document.getElementById('fold-btn').addEventListener('click', () => this.fold());
        document.getElementById('bet-btn').addEventListener('click', () => this.placeBet());
    }
    
    findGame() {
        this.ws.send(JSON.stringify({
            type: 'find_game'
        }));
    }
    
    fold() {
        if (!this.isMyTurn) return;
        
        this.ws.send(JSON.stringify({
            type: 'game_action',
            game_id: this.gameId,
            action: 'fold'
        }));
    }
    
    placeBet() {
        if (!this.isMyTurn) return;
        
        const amount = parseInt(document.getElementById('bet-amount').value);
        if (isNaN(amount) || amount < 100 || amount > 2000) {
            this.showError('Некорректная сумма ставки');
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'game_action',
            game_id: this.gameId,
            action: 'bet',
            amount: amount
        }));
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'game_state':
                this.updateGameState(data.state);
                break;
            case 'game_over':
                this.handleGameOver(data);
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }
    
    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suit.toLowerCase()}`;
        
        // Добавляем специальный класс для джокера
        if (card.is_joker) {
            cardElement.classList.add('joker');
        }
        
        // Формируем текст карты
        let cardText = card.rank;
        if (card.is_joker) {
            cardText = '9♣*';  // Джокер всегда 9 треф
        }
        
        cardElement.textContent = cardText;
        return cardElement;
    }
    
    updateGameState(state) {
        // Обновляем банк
        document.querySelector('#bank span').textContent = state.bank;
        document.querySelector('#current-bet span').textContent = state.current_bet;
        
        // Обновляем карты игрока
        const playerCards = document.getElementById('player-cards');
        playerCards.innerHTML = '';
        
        if (state.players[this.playerId]?.cards) {
            state.players[this.playerId].forEach(card => {
                playerCards.appendChild(this.createCardElement(card));
            });
        }
        
        // Обновляем статус хода
        this.isMyTurn = state.current_turn === this.playerId;
        
        // Обновляем кнопки
        document.getElementById('fold-btn').disabled = !this.isMyTurn;
        document.getElementById('bet-btn').disabled = !this.isMyTurn;
        document.getElementById('bet-amount').disabled = !this.isMyTurn;
        
        // Обновляем минимальную ставку
        document.getElementById('bet-amount').min = state.current_bet || 100;
    }
    
    handleGameOver(data) {
        if (data.winner === this.playerId) {
            this.showError('Вы победили!');
        } else {
            this.showError('Вы проиграли!');
        }
        
        // Через 3 секунды ищем новую игру
        setTimeout(() => this.findGame(), 3000);
    }
    
    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.body.appendChild(errorElement);
        
        // Удаляем сообщение после анимации
        setTimeout(() => errorElement.remove(), 3000);
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    new Game();
}); 