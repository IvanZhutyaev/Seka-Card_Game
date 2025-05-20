class UIManager {
    constructor() {
        this.playerColors = [
            '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
            '#FF33F3', '#33FFBD', '#FFBD33', '#8D33FF', '#33A2FF'
        ];
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
            playersLeft: document.getElementById('playersLeft'),
            playersRight: document.getElementById('playersRight')
        };
    }

    initTelegramWebApp() {
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.expand();
            const user = Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                this.elements.playerTurnInfo.textContent = `Добро пожаловать, ${user.first_name || 'Игрок'}!`;
            }
            return user;
        }
        return null;
    }

    setupEventListeners() {
        this.elements.menuButton.addEventListener('click', () => {
            this.toggleDropdown();
        });

        this.elements.soundButton.addEventListener('click', () => {
            alert('Регулировка звука');
        });

        this.elements.exitButton.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                Telegram.WebApp.close();
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target !== this.elements.menuButton && 
                !this.elements.dropdownMenu.contains(event.target)) {
                this.elements.dropdownMenu.style.display = 'none';
            }
        });
    }

    toggleDropdown() {
        const display = this.elements.dropdownMenu.style.display;
        this.elements.dropdownMenu.style.display = display === 'block' ? 'none' : 'block';
    }

    updatePlayer(playerData) {
        const slot = this.findPlayerSlot(playerData.id);
        if (slot) {
            this.fillPlayerSlot(slot, playerData);
            if (!slot.classList.contains('active')) {
                slot.classList.add('active');
            }
        } else {
            this.addNewPlayer(playerData);
        }
    }

    findPlayerSlot(playerId) {
        for (let i = 1; i <= 6; i++) {
            const slot = document.getElementById(`player-slot-${i}`);
            if (slot.dataset.playerId === playerId) {
                return slot;
            }
        }
        return null;
    }

    addNewPlayer(playerData) {
        for (let i = 1; i <= 6; i++) {
            const slot = document.getElementById(`player-slot-${i}`);
            if (!slot.dataset.playerId) {
                slot.dataset.playerId = playerData.id;
                this.fillPlayerSlot(slot, playerData);
                slot.classList.add('active');
                break;
            }
        }
    }

    fillPlayerSlot(slot, playerData) {
        const avatar = slot.querySelector('.player-avatar');
        const name = slot.querySelector('.player-name');
        const balance = slot.querySelector('.player-balance');
        const action = slot.querySelector('.player-action');

        // Обновляем аватар
        if (playerData.photo_url) {
            avatar.style.backgroundImage = `url('${playerData.photo_url}')`;
            avatar.textContent = '';
        } else {
            const initials = (playerData.first_name?.[0] || '') + (playerData.last_name?.[0] || '');
            avatar.style.backgroundColor = this.playerColors[Math.floor(Math.random() * this.playerColors.length)];
            avatar.textContent = initials;
            avatar.style.backgroundImage = 'none';
        }

        // Обновляем имя
        name.textContent = playerData.first_name + (playerData.last_name ? ` ${playerData.last_name}` : '');

        // Обновляем баланс
        balance.textContent = `$ ${(playerData.balance || 0).toFixed(2)}`;

        // Обновляем действие
        if (playerData.action) {
            action.textContent = playerData.action;
            action.style.backgroundColor = this.getActionColor(playerData.action);
        }

        // Подсветка текущего игрока
        if (playerData.is_current) {
            slot.classList.add('current-player');
        } else {
            slot.classList.remove('current-player');
        }
    }

    getActionColor(action) {
        switch (action) {
            case "Ходит": return "rgba(0, 150, 0, 0.5)";
            case "Пас": return "rgba(150, 0, 0, 0.5)";
            case "Оплатил": return "rgba(0, 0, 150, 0.5)";
            default: return "rgba(0, 0, 0, 0.3)";
        }
    }

    updateUI(gameState) {
        // Обновляем банк
        this.elements.bankAmount.textContent = `$ ${gameState.bankAmount.toFixed(2)}`;

        // Обновляем текущий ход
        if (gameState.currentTurn) {
            this.elements.playerTurnInfo.textContent = `Очередь игрока: ${gameState.currentTurn}`;
        }

        // Обновляем игроков
        if (gameState.players) {
            // Сначала очищаем все слоты
            for (let i = 1; i <= 6; i++) {
                const slot = document.getElementById(`player-slot-${i}`);
                slot.dataset.playerId = '';
                slot.classList.remove('active', 'current-player');
                slot.querySelector('.player-avatar').textContent = '?';
                slot.querySelector('.player-avatar').style.backgroundImage = '';
                slot.querySelector('.player-avatar').style.backgroundColor = '#ccc';
                slot.querySelector('.player-name').textContent = `Игрок ${i}`;
                slot.querySelector('.player-balance').textContent = '$ 0.00';
                slot.querySelector('.player-action').textContent = 'Ожидание';
                slot.querySelector('.player-action').style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            }

            // Заполняем активные слоты
            gameState.players.forEach(player => {
                this.updatePlayer(player);
            });
        }
    }

    showGameMessage(message) {
        const prevMessage = this.elements.playerTurnInfo.textContent;
        this.elements.playerTurnInfo.textContent = message;
        
        setTimeout(() => {
            this.elements.playerTurnInfo.textContent = prevMessage;
        }, 3000);
    }
}