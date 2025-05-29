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
        this.lobbyPlayers = 1;
        this.lobbyOverlay = null;
        this.dealAnimationInProgress = false;
        this.dealAnimationState = {};
        this.turnTimer = null;
        this.turnTimerStart = 0;
        this.turnTimerDuration = 15000; // 15 секунд на ход
        this.lastTurnPlayer = null;
        this.svaraOverlay = null;
        
        this.setupLogger();
        this.createLobbyOverlay();
        this.showLobbyOverlay(1);
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
        // 2. Закрытие WebSocket при уходе
        window.onbeforeunload = () => {
            if (this.ws) this.ws.close();
        };
        // 3. Проверка размера экрана
        if (window.innerWidth < 340 || window.innerHeight < 500) {
            alert('Внимание! Ваш экран слишком маленький для комфортной игры.');
        }
        this.reconnectDelay = 1000; // начальная задержка для reconnect
        this.maxReconnectDelay = 30000;
        this.lastActionTime = 0; // для throttling
        this.createSvaraOverlay();
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
            this.showError('Ошибка: не удалось получить ID игрока.');
            this.showLobbyOverlay(1);
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const initData = params.get('initData');
        const hash = params.get('hash');
        
        if (!initData || !hash) {
            this.log('Missing initialization data', 'error');
            this.showError('Ошибка: отсутствуют данные инициализации. Попробуйте перезапустить WebApp.');
            this.showLobbyOverlay(1);
            return;
        }
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/${this.playerId}?initData=${initData}&hash=${hash}`;
        this.log('Connecting to WebSocket: ' + wsUrl);
        
        const connectWS = () => {
            this.ws = new WebSocket(wsUrl);
            this.updateStatusIndicator('connecting');
            this.ws.onopen = () => {
                this.log('WebSocket connected', 'success');
                this.updateStatusIndicator('online');
                this.reconnectDelay = 1000;
                this.findNewGame();
            };
            this.ws.onmessage = (event) => {
                this.log('Received message: ' + event.data);
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };
            this.ws.onclose = () => {
                this.log('WebSocket disconnected', 'warning');
                this.updateStatusIndicator('offline');
                this.showError('Соединение потеряно');
                setTimeout(() => {
                    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
                    connectWS();
                }, this.reconnectDelay);
            };
            this.ws.onerror = (error) => {
                this.log('WebSocket error: ' + error, 'error');
                this.updateStatusIndicator('offline');
                this.showError('Ошибка соединения');
            };
        };
        connectWS();
    }
    
    initEventListeners() {
        document.getElementById('fold-btn').addEventListener('click', () => this.fold());
        document.getElementById('bet-btn').addEventListener('click', () => this.placeBet());
    }
    
    handleMessage(data) {
        this.log('Handling message: ' + JSON.stringify(data));
        switch (data.type) {
            case 'lobby_state':
                this.lobbyPlayers = data.players_in_lobby;
                this.showLobbyOverlay(this.lobbyPlayers);
                break;
            case 'game_state':
                this.gameState = data.state;
                this.gameId = data.game_id;
                this.log('Game state updated. Game ID: ' + this.gameId);
                this.hideLobbyOverlay();
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
            case 'svara_started':
                this.log('Svara started. Players: ' + data.svara_players.join(', '));
                this.showSvaraOverlay(data.svara_players);
                this.updateGameState(data.state);
                break;
        }
    }
    
    updateGameState(state) {
        // Обновляем банк и текущую ставку
        document.querySelector('#bank span').textContent = state.bank;
        document.querySelector('#current-bet span').textContent = state.current_bet;
        
        this.gameState = state;

        // Анимация раздачи
        if (state.round === 'dealing' && !this.dealAnimationInProgress) {
            this.animateDeal();
        } else {
            this.renderPlayers();
            this.renderTopPanel();
            this.renderBottomPanel();
        }
        
        // Обновляем состояние кнопок с учетом свары
        this.isMyTurn = state.current_turn === this.playerId;
        const isBiddingRound = state.round === 'bidding';
        const isInSvara = state.status === 'svara' && state.svara_players.includes(this.playerId);
        
        // Блокируем кнопки если:
        // 1. Не ход игрока
        // 2. Не раунд торгов
        // 3. Свара и игрок не участвует
        const shouldDisableButtons = !this.isMyTurn || !isBiddingRound || (state.status === 'svara' && !isInSvara);
        
        document.getElementById('fold-btn').disabled = shouldDisableButtons;
        document.getElementById('bet-btn').disabled = shouldDisableButtons;
        document.getElementById('bet-amount').disabled = shouldDisableButtons;
        
        if (this.isMyTurn && isBiddingRound && (state.status !== 'svara' || isInSvara)) {
            document.getElementById('bet-amount').min = state.current_bet || 100;
        }
        
        // Таймер хода
        if (state.current_turn !== this.lastTurnPlayer) {
            this.lastTurnPlayer = state.current_turn;
            this.startTurnTimer();
        }
    }
    
    animateDeal() {
        this.dealAnimationInProgress = true;
        this.dealAnimationState = {};
        const state = this.gameState;
        const playerIds = Object.keys(state.players);
        const cardsPerPlayer = (state.players[playerIds[0]]?.cards || []).length;
        // Изначально у всех 0 карт
        playerIds.forEach(pid => { this.dealAnimationState[pid] = 0; });
        let cardIndex = 0;
        let self = this;
        function dealNext() {
            if (cardIndex >= cardsPerPlayer) {
                self.dealAnimationInProgress = false;
                self.renderPlayers();
                self.renderTopPanel();
                self.renderBottomPanel();
                return;
            }
            let i = 0;
            function dealToPlayer() {
                if (i >= playerIds.length) {
                    cardIndex++;
                    setTimeout(dealNext, 200);
                    return;
                }
                const pid = playerIds[i];
                self.dealAnimationState[pid] = cardIndex + 1;
                self.renderPlayers();
                i++;
                setTimeout(dealToPlayer, 120);
            }
            dealToPlayer();
        }
        dealNext();
    }

    renderPlayers() {
        const state = this.gameState;
        // Очищаем контейнеры
        let table = document.getElementById('seka-table');
        if (!table) {
            // Создаём контейнер для стола и игроков
            table = document.createElement('div');
            table.id = 'seka-table';
            table.style.position = 'relative';
            table.style.width = '340px';
            table.style.height = '420px';
            table.style.margin = '40px auto 0 auto';
            table.style.background = 'radial-gradient(ellipse at center, #2e8b57 80%, #145c2c 100%)';
            table.style.borderRadius = '40px';
            table.style.boxShadow = '0 0 32px #000a';
            table.style.display = 'block';
            table.style.zIndex = '10';
            // Логотип и банк
            const logo = document.createElement('div');
            logo.id = 'seka-logo';
            logo.textContent = 'СЕКА';
            logo.style.position = 'absolute';
            logo.style.top = '40px';
            logo.style.left = '50%';
            logo.style.transform = 'translateX(-50%)';
            logo.style.fontSize = '32px';
            logo.style.fontWeight = 'bold';
            logo.style.letterSpacing = '6px';
            logo.style.color = '#ffd700';
            logo.style.textShadow = '0 2px 8px #000a';
            table.appendChild(logo);
            const bank = document.createElement('div');
            bank.id = 'seka-bank';
            bank.style.position = 'absolute';
            bank.style.top = '110px';
            bank.style.left = '50%';
            bank.style.transform = 'translateX(-50%)';
            bank.style.fontSize = '20px';
            bank.style.color = '#fff';
            bank.style.fontWeight = 'bold';
            bank.style.textShadow = '0 2px 8px #000a';
            table.appendChild(bank);
            document.getElementById('app').appendChild(table);
        }
        // Обновляем банк
        const bankDiv = document.getElementById('seka-bank');
        if (bankDiv) bankDiv.textContent = `Банк: ${state.bank || 0}₽`;
        // Удаляем старые места игроков
        Array.from(document.querySelectorAll('.seka-seat')).forEach(e => e.remove());
        // Позиции для 6 игроков (3 слева, 3 справа)
        const seatPositions = [
            {top: 30, left: -60},   // верхний левый
            {top: 120, left: -80}, // средний левый
            {top: 260, left: -60}, // нижний левый
            {top: 260, left: 320}, // нижний правый
            {top: 120, left: 340}, // средний правый
            {top: 30, left: 320}   // верхний правый
        ];
        // Получаем массив игроков (или пустых мест)
        const playerIds = Object.keys(state.players);
        for (let i = 0; i < 6; i++) {
            const pid = playerIds[i];
            const player = pid ? state.players[pid] : null;
            const seat = document.createElement('div');
            seat.className = 'seka-seat';
            seat.style.position = 'absolute';
            seat.style.width = '90px';
            seat.style.height = '120px';
            seat.style.top = seatPositions[i].top + 'px';
            seat.style.left = seatPositions[i].left + 'px';
            seat.style.display = 'flex';
            seat.style.flexDirection = 'column';
            seat.style.alignItems = 'center';
            seat.style.justifyContent = 'flex-start';
            seat.style.zIndex = '20';
            // Если игрок есть
            if (player) {
                // Аватар
                const user = player.user_info || {};
                const avatarWrap = document.createElement('div');
                avatarWrap.style.position = 'relative';
                avatarWrap.style.width = '54px';
                avatarWrap.style.height = '54px';
                // Круговой таймер
                if (this.gameState.current_turn === pid) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('width', '54');
                    svg.setAttribute('height', '54');
                    svg.style.position = 'absolute';
                    svg.style.top = '0';
                    svg.style.left = '0';
                    svg.style.zIndex = '2';
                    const r = 25;
                    const c = 2 * Math.PI * r;
                    const progress = this.getTurnProgress();
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '27');
                    circle.setAttribute('cy', '27');
                    circle.setAttribute('r', r.toString());
                    circle.setAttribute('stroke', '#ffd700');
                    circle.setAttribute('stroke-width', '4');
                    circle.setAttribute('fill', 'none');
                    circle.setAttribute('stroke-dasharray', c.toString());
                    circle.setAttribute('stroke-dashoffset', (c * (1 - progress)).toString());
                    circle.style.transition = 'stroke-dashoffset 0.1s linear';
                    svg.appendChild(circle);
                    avatarWrap.appendChild(svg);
                }
                const avatar = document.createElement('img');
                avatar.src = user.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                avatar.alt = user.first_name || user.username || pid;
                avatar.style.width = '48px';
                avatar.style.height = '48px';
                avatar.style.borderRadius = '50%';
                avatar.style.marginBottom = '2px';
                avatar.style.boxShadow = '0 2px 8px #0006';
                avatar.style.position = 'absolute';
                avatar.style.top = '3px';
                avatar.style.left = '3px';
                avatarWrap.appendChild(avatar);
                seat.appendChild(avatarWrap);
                // Имя
                const nameDiv = document.createElement('div');
                nameDiv.textContent = user.first_name || user.username || pid;
                nameDiv.style.fontWeight = 'bold';
                nameDiv.style.fontSize = '13px';
                nameDiv.style.color = '#fff';
                nameDiv.style.textShadow = '0 1px 4px #000a';
                seat.appendChild(nameDiv);
                // Баланс
                const balDiv = document.createElement('div');
                balDiv.textContent = `${player.balance || 1500}₽`;
                balDiv.style.fontSize = '12px';
                balDiv.style.color = '#ffd700';
                seat.appendChild(balDiv);
                // Статус
                const statusDiv = document.createElement('div');
                statusDiv.textContent = player.folded ? 'Пас' : (state.current_turn === pid ? 'Ходит' : '');
                statusDiv.style.fontSize = '12px';
                statusDiv.style.color = player.folded ? '#f44336' : (state.current_turn === pid ? '#4CAF50' : '#aaa');
                seat.appendChild(statusDiv);
                // Ставка
                if (player.bet && player.bet > 0) {
                    const betDiv = document.createElement('div');
                    betDiv.textContent = `Ставка: ${player.bet}₽`;
                    betDiv.style.fontSize = '12px';
                    betDiv.style.color = '#fff';
                    betDiv.style.background = '#222a';
                    betDiv.style.borderRadius = '8px';
                    betDiv.style.padding = '2px 6px';
                    betDiv.style.margin = '2px 0';
                    seat.appendChild(betDiv);
                }
                // Карты (рубашки, если не вскрытие)
                const cardsDiv = document.createElement('div');
                cardsDiv.style.display = 'flex';
                cardsDiv.style.gap = '2px';
                let showCards = (this.gameState.round === 'showdown' || pid === this.playerId);
                (player.cards || []).forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card';
                    cardDiv.style.width = '28px';
                    cardDiv.style.height = '40px';
                    cardDiv.style.borderRadius = '5px';
                    cardDiv.style.background = showCards ? '#fff' : 'linear-gradient(135deg,#345,#789)';
                    cardDiv.style.color = showCards ? '#000' : 'transparent';
                    cardDiv.style.display = 'flex';
                    cardDiv.style.alignItems = 'center';
                    cardDiv.style.justifyContent = 'center';
                    cardDiv.style.fontWeight = 'bold';
                    cardDiv.style.fontSize = '16px';
                    cardDiv.style.boxShadow = '0 1px 4px #0006';
                    cardDiv.style.marginTop = '2px';
                    cardDiv.textContent = showCards ? (card.rank + card.suit) : '🂠';
                    cardsDiv.appendChild(cardDiv);
                });
                seat.appendChild(cardsDiv);
                
                // Добавляем выделение для участников свары
                if (state.status === 'svara' && state.svara_players.includes(pid)) {
                    seat.style.border = '2px solid #ffd700';
                    seat.style.boxShadow = '0 0 10px #ffd700';
                }
            } else {
                // Пустое место — заглушка
                const empty = document.createElement('div');
                empty.style.width = '48px';
                empty.style.height = '48px';
                empty.style.borderRadius = '50%';
                empty.style.background = '#ccc';
                empty.style.opacity = '0.5';
                empty.style.marginBottom = '2px';
                seat.appendChild(empty);
            }
            table.appendChild(seat);
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
        
        this.hideSvaraOverlay(); // Скрываем оверлей свары при завершении игры
    }
    
    showAllCards(state) {
        // Не нужен, теперь всё делается в updateGameState
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
    
    placeBet(amount) {
        const now = Date.now();
        if (now - this.lastActionTime < 1500) {
            this.showError('Слишком часто! Подождите немного.');
            return;
        }
        this.lastActionTime = now;
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
        let betAmount = amount;
        if (betAmount === undefined) {
            betAmount = this.gameState.current_bet || 0;
        }
        if (isNaN(betAmount) || betAmount < 25 || betAmount > (this.gameState.players[this.playerId].balance || 0)) {
            this.log('Некорректная сумма ставки: ' + betAmount, 'error');
            this.showError('Некорректная сумма ставки');
            return;
        }
        const message = {
            type: 'game_action',
            game_id: this.gameId,
            action: 'bet',
            amount: betAmount
        };
        this.log('Sending bet message:', message);
        this.ws.send(JSON.stringify(message));
    }
    
    fold() {
        const now = Date.now();
        if (now - this.lastActionTime < 1500) {
            this.showError('Слишком часто! Подождите немного.');
            return;
        }
        this.lastActionTime = now;
        if (!this.isMyTurn) return;
        
        this.ws.send(JSON.stringify({
            type: 'game_action',
            game_id: this.gameId,
            action: 'fold'
        }));
    }
    
    findNewGame() {
        // Передаём данные Telegram-пользователя, если есть
        let user = null;
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            user = window.Telegram.WebApp.initDataUnsafe.user;
        }
        const message = {
            type: 'find_game'
        };
        if (user) message.user = user;
        this.ws.send(JSON.stringify(message));
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

    createLobbyOverlay() {
        // Создаем оверлей для лобби
        const overlay = document.createElement('div');
        overlay.id = 'lobby-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(10, 26, 58, 0.98);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 22px;
        `;
        // Анимация загрузки
        const spinner = document.createElement('div');
        spinner.className = 'lobby-spinner';
        spinner.style.cssText = `
            border: 8px solid #f3f3f3;
            border-top: 8px solid #3498db;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin-bottom: 30px;
        `;
        overlay.appendChild(spinner);
        // Текст
        const text = document.createElement('div');
        text.id = 'lobby-text';
        text.textContent = 'Ожидание игроков...';
        overlay.appendChild(text);
        // Счетчик
        const counter = document.createElement('div');
        counter.id = 'lobby-counter';
        counter.style.marginTop = '10px';
        counter.textContent = 'Игроков в лобби: 1/6';
        overlay.appendChild(counter);
        // Кнопка отмены
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.style.marginTop = '30px';
        cancelBtn.style.padding = '10px 30px';
        cancelBtn.style.background = '#f44336';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '8px';
        cancelBtn.style.fontSize = '20px';
        cancelBtn.onclick = () => {
            if (this.ws) this.ws.close();
            window.location.href = '/main_menu';
        };
        overlay.appendChild(cancelBtn);
        // Таймаут ожидания
        this.lobbyTimeout = setTimeout(() => {
            this.showError('Время ожидания истекло. Попробуйте снова.');
            if (this.ws) this.ws.close();
            window.location.href = '/main_menu';
        }, 60000);
        document.body.appendChild(overlay);
        this.lobbyOverlay = overlay;
    }

    showLobbyOverlay(playersCount) {
        if (!this.lobbyOverlay) this.createLobbyOverlay();
        this.lobbyOverlay.style.display = 'flex';
        document.getElementById('lobby-counter').textContent = `Игроков в лобби: ${playersCount}/6`;
        // Сброс таймаута при повторном показе
        if (this.lobbyTimeout) clearTimeout(this.lobbyTimeout);
        this.lobbyTimeout = setTimeout(() => {
            this.showError('Время ожидания истекло. Попробуйте снова.');
            if (this.ws) this.ws.close();
            window.location.href = '/main_menu';
        }, 60000);
    }

    hideLobbyOverlay() {
        if (this.lobbyOverlay) this.lobbyOverlay.style.display = 'none';
        if (this.lobbyTimeout) clearTimeout(this.lobbyTimeout);
    }

    renderTopPanel() {
        let panel = document.getElementById('seka-top-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'seka-top-panel';
            panel.style.position = 'fixed';
            panel.style.top = '0';
            panel.style.left = '0';
            panel.style.right = '0';
            panel.style.height = '48px';
            panel.style.background = 'rgba(10,26,58,0.98)';
            panel.style.display = 'flex';
            panel.style.alignItems = 'center';
            panel.style.justifyContent = 'space-between';
            panel.style.zIndex = '100';
            panel.style.padding = '0 12px';
            // Меню
            const menuBtn = document.createElement('div');
            menuBtn.innerHTML = '&#9776;';
            menuBtn.style.fontSize = '26px';
            menuBtn.style.color = '#fff';
            menuBtn.style.cursor = 'pointer';
            menuBtn.title = 'Меню';
            panel.appendChild(menuBtn);
            // Строка очереди
            const queueDiv = document.createElement('div');
            queueDiv.id = 'seka-queue';
            queueDiv.style.background = '#fff2';
            queueDiv.style.borderRadius = '8px';
            queueDiv.style.padding = '4px 16px';
            queueDiv.style.color = '#fff';
            queueDiv.style.fontSize = '15px';
            queueDiv.style.fontWeight = 'bold';
            queueDiv.style.margin = '0 12px';
            panel.appendChild(queueDiv);
            // Звук
            const soundBtn = document.createElement('div');
            soundBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19 5a7 7 0 0 1 0 14"></path></svg>';
            soundBtn.style.marginLeft = 'auto';
            soundBtn.style.cursor = 'pointer';
            soundBtn.title = 'Звук';
            panel.appendChild(soundBtn);
            document.body.appendChild(panel);
        }
        // Обновляем строку очереди
        const queueDiv = document.getElementById('seka-queue');
        if (queueDiv && this.gameState && this.gameState.current_turn) {
            const pid = this.gameState.current_turn;
            const player = this.gameState.players[pid];
            const user = player?.user_info || {};
            const name = user.first_name || user.username || pid;
            queueDiv.textContent = `Очередь: игрок ${name}`;
        }
        // Добавить индикатор статуса
        let indicator = document.getElementById('ws-status-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'ws-status-indicator';
            indicator.style.marginLeft = '10px';
            indicator.style.width = '12px';
            indicator.style.height = '12px';
            indicator.style.borderRadius = '50%';
            indicator.style.display = 'inline-block';
            indicator.style.verticalAlign = 'middle';
            document.body.appendChild(indicator);
        }
    }

    renderBottomPanel() {
        let panel = document.getElementById('seka-bottom-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'seka-bottom-panel';
            panel.style.position = 'fixed';
            panel.style.left = '0';
            panel.style.right = '0';
            panel.style.bottom = '0';
            panel.style.height = '120px';
            panel.style.background = 'rgba(10,26,58,0.98)';
            panel.style.display = 'flex';
            panel.style.flexDirection = 'column';
            panel.style.alignItems = 'center';
            panel.style.justifyContent = 'center';
            panel.style.zIndex = '100';
            document.body.appendChild(panel);
        }
        panel.innerHTML = '';
        // Получаем своего игрока
        const player = this.gameState.players[this.playerId];
        if (!player) return;
        const isMyTurn = this.gameState.current_turn === this.playerId;
        // Если не ваш ход — просто сообщение
        if (!isMyTurn) {
            const waitDiv = document.createElement('div');
            waitDiv.textContent = 'Ожидайте очереди';
            waitDiv.style.color = '#fff';
            waitDiv.style.fontSize = '22px';
            waitDiv.style.marginTop = '24px';
            panel.appendChild(waitDiv);
            return;
        }
        // Ваши карты
        const cardsDiv = document.createElement('div');
        cardsDiv.style.display = 'flex';
        cardsDiv.style.gap = '8px';
        cardsDiv.style.marginBottom = '8px';
        (player.cards || []).forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.style.width = '48px';
            cardDiv.style.height = '68px';
            cardDiv.style.borderRadius = '8px';
            cardDiv.style.background = '#fff';
            cardDiv.style.color = '#000';
            cardDiv.style.display = 'flex';
            cardDiv.style.alignItems = 'center';
            cardDiv.style.justifyContent = 'center';
            cardDiv.style.fontWeight = 'bold';
            cardDiv.style.fontSize = '28px';
            cardDiv.style.boxShadow = '0 2px 8px #0006';
            cardDiv.textContent = card.rank + card.suit;
            cardsDiv.appendChild(cardDiv);
        });
        panel.appendChild(cardsDiv);
        // Кнопки действий
        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '12px';
        actionsDiv.style.marginBottom = '8px';
        // Уравнять
        const callBtn = document.createElement('button');
        callBtn.textContent = 'Уравнять';
        callBtn.className = 'seka-btn seka-btn-call';
        callBtn.onclick = () => this.placeBet();
        actionsDiv.appendChild(callBtn);
        // Поднять
        const raiseBtn = document.createElement('button');
        raiseBtn.textContent = 'Поднять';
        raiseBtn.className = 'seka-btn seka-btn-raise';
        raiseBtn.onclick = () => this.showBetModal();
        actionsDiv.appendChild(raiseBtn);
        // Пас
        const foldBtn = document.createElement('button');
        foldBtn.textContent = 'Пас';
        foldBtn.className = 'seka-btn seka-btn-fold';
        foldBtn.onclick = () => this.fold();
        actionsDiv.appendChild(foldBtn);
        panel.appendChild(actionsDiv);
        // Ваша ставка, баланс, аватар
        const infoDiv = document.createElement('div');
        infoDiv.style.display = 'flex';
        infoDiv.style.alignItems = 'center';
        infoDiv.style.gap = '18px';
        infoDiv.style.color = '#fff';
        infoDiv.style.fontSize = '16px';
        // Ставка
        const betDiv = document.createElement('div');
        betDiv.textContent = `Ваша ставка: ${player.bet || 0}₽`;
        betDiv.style.color = '#fff';
        infoDiv.appendChild(betDiv);
        // Баланс
        const balDiv = document.createElement('div');
        balDiv.textContent = `Баланс: ${player.balance || 0}₽`;
        balDiv.style.color = '#ffd700';
        infoDiv.appendChild(balDiv);
        // Аватар
        const avatar = document.createElement('img');
        const user = player.user_info || {};
        avatar.src = user.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        avatar.alt = user.first_name || user.username || this.playerId;
        avatar.style.width = '36px';
        avatar.style.height = '36px';
        avatar.style.borderRadius = '50%';
        avatar.style.marginLeft = '8px';
        infoDiv.appendChild(avatar);
        panel.appendChild(infoDiv);
    }

    startTurnTimer() {
        if (this.turnTimer) clearInterval(this.turnTimer);
        this.turnTimerStart = Date.now();
        const update = () => {
            this.renderPlayers();
        };
        this.turnTimer = setInterval(update, 100);
        setTimeout(() => {
            if (this.turnTimer) {
                clearInterval(this.turnTimer);
                this.turnTimer = null;
                this.renderPlayers();
            }
        }, this.turnTimerDuration);
    }

    getTurnProgress() {
        if (!this.lastTurnPlayer) return 1;
        const elapsed = Date.now() - this.turnTimerStart;
        return Math.max(0, 1 - elapsed / this.turnTimerDuration);
    }

    showBetModal() {
        // Если уже открыто — не открываем повторно
        if (document.getElementById('seka-bet-modal')) return;
        const player = this.gameState.players[this.playerId];
        if (!player) return;
        const balance = player.balance || 0;
        const minBet = Math.max(this.gameState.current_bet || 25, 25);
        const maxBet = balance;
        let selectedBet = minBet;
        // Оверлей
        const overlay = document.createElement('div');
        overlay.id = 'seka-bet-modal';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.65)';
        overlay.style.zIndex = '2000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        // Модальное окно
        const modal = document.createElement('div');
        modal.style.background = '#222';
        modal.style.borderRadius = '18px';
        modal.style.padding = '28px 18px 18px 18px';
        modal.style.minWidth = '320px';
        modal.style.boxShadow = '0 4px 32px #000a';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        // Заголовок
        const title = document.createElement('div');
        title.textContent = 'Делайте ваши ставки';
        title.style.color = '#fff';
        title.style.fontSize = '20px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '16px';
        modal.appendChild(title);
        // Фишки
        const chips = [25, 50, 100, 200, 500, 1000];
        const chipsDiv = document.createElement('div');
        chipsDiv.style.display = 'flex';
        chipsDiv.style.overflowX = 'auto';
        chipsDiv.style.gap = '16px';
        chipsDiv.style.marginBottom = '18px';
        chipsDiv.style.padding = '6px 0';
        chips.forEach(chip => {
            const chipDiv = document.createElement('div');
            chipDiv.textContent = chip + '₽';
            chipDiv.style.width = '54px';
            chipDiv.style.height = '54px';
            chipDiv.style.borderRadius = '50%';
            chipDiv.style.background = selectedBet === chip ? '#ffd700' : '#fff';
            chipDiv.style.color = selectedBet === chip ? '#222' : '#333';
            chipDiv.style.display = 'flex';
            chipDiv.style.alignItems = 'center';
            chipDiv.style.justifyContent = 'center';
            chipDiv.style.fontWeight = 'bold';
            chipDiv.style.fontSize = '18px';
            chipDiv.style.boxShadow = '0 2px 8px #0006';
            chipDiv.style.cursor = 'pointer';
            chipDiv.style.border = selectedBet === chip ? '3px solid #ffd700' : '2px solid #ccc';
            chipDiv.onclick = () => {
                selectedBet = chip;
                Array.from(chipsDiv.children).forEach((c, i) => {
                    c.style.background = chip === chips[i] ? '#ffd700' : '#fff';
                    c.style.color = chip === chips[i] ? '#222' : '#333';
                    c.style.border = chip === chips[i] ? '3px solid #ffd700' : '2px solid #ccc';
                });
                betSumDiv.textContent = selectedBet + '₽';
            };
            chipsDiv.appendChild(chipDiv);
        });
        modal.appendChild(chipsDiv);
        // Кнопки отмена/максимум
        const btnsDiv = document.createElement('div');
        btnsDiv.style.display = 'flex';
        btnsDiv.style.gap = '18px';
        btnsDiv.style.marginBottom = '12px';
        // Отмена
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.className = 'seka-btn seka-btn-fold';
        cancelBtn.onclick = () => overlay.remove();
        btnsDiv.appendChild(cancelBtn);
        // Максимум
        const maxBtn = document.createElement('button');
        maxBtn.textContent = 'Максимум';
        maxBtn.className = 'seka-btn seka-btn-call';
        maxBtn.onclick = () => {
            selectedBet = maxBet;
            Array.from(chipsDiv.children).forEach((c, i) => {
                c.style.background = chips[i] === maxBet ? '#ffd700' : '#fff';
                c.style.color = chips[i] === maxBet ? '#222' : '#333';
                c.style.border = chips[i] === maxBet ? '3px solid #ffd700' : '2px solid #ccc';
            });
            betSumDiv.textContent = selectedBet + '₽';
        };
        btnsDiv.appendChild(maxBtn);
        modal.appendChild(btnsDiv);
        // Сумма ставки
        const betSumDiv = document.createElement('div');
        betSumDiv.textContent = selectedBet + '₽';
        betSumDiv.style.color = '#ffd700';
        betSumDiv.style.fontSize = '28px';
        betSumDiv.style.fontWeight = 'bold';
        betSumDiv.style.marginBottom = '12px';
        modal.appendChild(betSumDiv);
        // Подтвердить ставку
        const okBtn = document.createElement('button');
        okBtn.textContent = 'Сделать ставку';
        okBtn.className = 'seka-btn seka-btn-raise';
        okBtn.style.width = '100%';
        okBtn.onclick = () => {
            this.placeBet(selectedBet);
            overlay.remove();
        };
        modal.appendChild(okBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // Индикатор статуса соединения
    updateStatusIndicator(status) {
        let indicator = document.getElementById('ws-status-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'ws-status-indicator';
            indicator.style.marginLeft = '10px';
            indicator.style.width = '12px';
            indicator.style.height = '12px';
            indicator.style.borderRadius = '50%';
            indicator.style.display = 'inline-block';
            indicator.style.verticalAlign = 'middle';
            document.body.appendChild(indicator);
        }
        if (status === 'online') {
            indicator.style.background = '#4CAF50';
        } else if (status === 'connecting') {
            indicator.style.background = '#FFD600';
        } else {
            indicator.style.background = '#F44336';
        }
    }

    createSvaraOverlay() {
        this.svaraOverlay = document.createElement('div');
        this.svaraOverlay.id = 'svara-overlay';
        this.svaraOverlay.style.display = 'none';
        this.svaraOverlay.style.position = 'fixed';
        this.svaraOverlay.style.top = '0';
        this.svaraOverlay.style.left = '0';
        this.svaraOverlay.style.width = '100%';
        this.svaraOverlay.style.height = '100%';
        this.svaraOverlay.style.background = 'rgba(0,0,0,0.8)';
        this.svaraOverlay.style.zIndex = '1000';
        this.svaraOverlay.style.color = '#fff';
        this.svaraOverlay.style.textAlign = 'center';
        this.svaraOverlay.style.padding = '20px';
        this.svaraOverlay.style.boxSizing = 'border-box';
        
        const content = document.createElement('div');
        content.style.position = 'absolute';
        content.style.top = '50%';
        content.style.left = '50%';
        content.style.transform = 'translate(-50%, -50%)';
        content.style.background = '#1a1a1a';
        content.style.padding = '20px';
        content.style.borderRadius = '10px';
        content.style.border = '2px solid #ffd700';
        
        const title = document.createElement('h2');
        title.textContent = 'Свара!';
        title.style.color = '#ffd700';
        title.style.marginBottom = '20px';
        
        const message = document.createElement('p');
        message.id = 'svara-message';
        message.style.marginBottom = '20px';
        
        content.appendChild(title);
        content.appendChild(message);
        this.svaraOverlay.appendChild(content);
        document.body.appendChild(this.svaraOverlay);
    }

    showSvaraOverlay(svaraPlayers) {
        const isInSvara = svaraPlayers.includes(this.playerId);
        const message = document.getElementById('svara-message');
        if (isInSvara) {
            message.textContent = 'Вы участвуете в сваре! Сделайте ставку.';
            message.style.color = '#4CAF50';
        } else {
            message.textContent = 'Вы не участвуете в сваре. Ожидайте результата.';
            message.style.color = '#f44336';
        }
        this.svaraOverlay.style.display = 'block';
    }

    hideSvaraOverlay() {
        this.svaraOverlay.style.display = 'none';
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    new Game();
}); 

// CSS для анимации спиннера
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`;
document.head.appendChild(style);

// Добавляю стили для рамок игроков и рубашки карт
const style2 = document.createElement('style');
style2.innerHTML = `
.player-frame { transition: box-shadow 0.2s; box-shadow: 0 2px 8px #0003; }
.player-frame.me { border-color: #2196f3 !important; }
.player-frame.current { box-shadow: 0 0 16px #4CAF50; }
.player-frame.folded { opacity: 0.5; }
.card-back { background: linear-gradient(135deg,#345,#789) !important; color: transparent !important; }
`;
document.head.appendChild(style2);

// Добавляю стили для стола и мест игроков
const style3 = document.createElement('style');
style3.innerHTML = `
#seka-table { min-width: 340px; min-height: 420px; }
.seka-seat { transition: box-shadow 0.2s; }
`;
document.head.appendChild(style3);

// Добавляю стили для верхней панели
const style4 = document.createElement('style');
style4.innerHTML = `
#seka-top-panel { box-shadow: 0 2px 8px #0003; }
`;
document.head.appendChild(style4);

// Добавляю стили для нижней панели и кнопок
const style5 = document.createElement('style');
style5.innerHTML = `
#seka-bottom-panel { box-shadow: 0 -2px 8px #0003; }
.seka-btn { border: none; border-radius: 8px; padding: 10px 22px; font-size: 17px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.seka-btn-call { background: #7b1fa2; color: #fff; }
.seka-btn-raise { background: #388e3c; color: #fff; }
.seka-btn-fold { background: #eee; color: #222; }
.seka-btn:active { filter: brightness(0.9); }
`;
document.head.appendChild(style5);

// Добавляю стили для модального окна ставок и фишек
const style6 = document.createElement('style');
style6.innerHTML = `
#seka-bet-modal { animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
document.head.appendChild(style6);

// 1. Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
    alert('Произошла критическая ошибка: ' + message);
    return false;
}; 