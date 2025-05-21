class UIManager {
    constructor() {
        this.playerSlots = Array.from({length: 6}, (_, i) => `player-slot-${i+1}`);
        this.controller = null;
        this.initElements();
        this.setupEventListeners();
    }

    initElements() {
        this.elements = {
            menuButton: document.getElementById('menuButton'),
            soundButton: document.getElementById('soundButton'),
            exitButton: document.getElementById('exitButton'),
            dropdownMenu: document.getElementById('dropdownMenu'),
            playerTurnInfo: document.getElementById('playerTurnInfo'),
            bankAmount: document.getElementById('bankAmount'),
            actionButtons: {
                bet: this.createActionButton("Ставка", "#4CAF50"),
                fold: this.createActionButton("Пас", "#F44336")
            }
        };
    }

    createActionButton(text, color) {
        const button = document.createElement('button');
        button.className = 'action-button';
        button.textContent = text;
        button.style.backgroundColor = color;
        button.style.display = 'none';
        document.querySelector('.main-area').appendChild(button);
        return button;
    }

    setupEventListeners() {
        // Меню
        this.elements.menuButton.addEventListener('click', () => this.toggleMenu());
        document.addEventListener('click', (e) => {
            if (!this.elements.dropdownMenu.contains(e.target) && e.target !== this.elements.menuButton) {
                this.elements.dropdownMenu.style.display = 'none';
            }
        });

        // Кнопки действий
        this.elements.actionButtons.bet.addEventListener('click', () => this.handleBet());
        this.elements.actionButtons.fold.addEventListener('click', () => this.handleFold());

        // Прочие кнопки
        this.elements.soundButton.addEventListener('click', () => this.toggleSound());
        this.elements.exitButton.addEventListener('click', () => this.exitHandler?.());
    }

    setController(controller) {
        this.controller = controller;
    }

    setExitHandler(handler) {
        this.exitHandler = handler;
    }

    setCurrentPlayer(player) {
        this.currentPlayer = player;
    }

    initUI() {
        this.updateGameState({
            bankAmount: 0,
            currentTurn: "Ожидание игроков...",
            players: []
        });
    }

    updateGameState(state) {
        // Обновляем банк и текущий ход
        this.elements.bankAmount.textContent = `$ ${state.bankAmount.toFixed(2)}`;
        this.elements.playerTurnInfo.textContent = state.currentTurn || "Ожидание хода...";

        // Обновляем игроков
        state.players.forEach((player, index) => {
            if (index < this.playerSlots.length) {
                this.updatePlayerSlot(this.playerSlots[index], player);
            }
        });

        // Показываем/скрываем кнопки действий
        const currentPlayer = state.players.find(p => p.is_current);
        if (currentPlayer && currentPlayer.id === this.currentPlayer?.id) {
            this.showActionButtons();
        } else {
            this.hideActionButtons();
        }
    }

    updatePlayerSlot(slotId, player) {
        const slot = document.getElementById(slotId);
        if (!slot) return;

        // Обновляем аватар
        const avatar = slot.querySelector('.player-avatar');
        if (player.photo_url) {
            avatar.style.backgroundImage = `url('${player.photo_url}')`;
            avatar.textContent = '';
        } else {
            const initials = player.first_name?.[0] || '?';
            avatar.style.backgroundImage = '';
            avatar.style.backgroundColor = this.getRandomColor();
            avatar.textContent = initials;
        }

        // Обновляем остальные данные
        slot.querySelector('.player-name').textContent = player.first_name;
        slot.querySelector('.player-balance').textContent = `$ ${player.balance.toFixed(2)}`;
        
        const actionElement = slot.querySelector('.player-action');
        actionElement.textContent = player.action || 'Ожидание';
        actionElement.style.backgroundColor = this.getActionColor(player.action);

        // Подсветка текущего игрока
        slot.classList.toggle('current-player', player.is_current);
    }

    updatePlayer(playerData) {
        const slotIndex = this.gameState.players.findIndex(p => p.id === playerData.id);
        if (slotIndex >= 0 && slotIndex < this.playerSlots.length) {
            this.updatePlayerSlot(this.playerSlots[slotIndex], playerData);
        }
    }

    showActionButtons() {
        this.elements.actionButtons.bet.style.display = 'block';
        this.elements.actionButtons.fold.style.display = 'block';
    }

    hideActionButtons() {
        this.elements.actionButtons.bet.style.display = 'none';
        this.elements.actionButtons.fold.style.display = 'none';
    }

    toggleMenu() {
        const menu = this.elements.dropdownMenu;
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    toggleSound() {
        console.log("Sound toggled");
    }

    handleBet() {
        const amount = prompt("Введите сумму ставки:", "10");
        if (amount && !isNaN(amount)) {
            this.controller.placeBet(parseInt(amount));
        }
    }

    handleFold() {
        if (confirm("Вы уверены, что хотите сбросить карты?")) {
            this.controller.fold();
        }
    }

    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.body.appendChild(errorElement);
        setTimeout(() => errorElement.remove(), 3000);
    }

    getRandomColor() {
        const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getActionColor(action) {
        const colors = {
            'Ставка': 'rgba(76, 175, 80, 0.3)',
            'Пас': 'rgba(244, 67, 54, 0.3)',
            'default': 'rgba(0, 0, 0, 0.3)'
        };
        return colors[action] || colors.default;
    }
}