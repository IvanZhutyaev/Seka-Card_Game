class GameController {
    constructor(uiManager, socketHandler) {
        this.ui = uiManager;
        this.socket = socketHandler;
        this.currentPlayerId = null;
        this.gameState = {
            bankAmount: 0,
            currentTurn: null,
            players: []
        };
    }

    async init() {
        this.detectEnvironment();
        this.ui.setController(this);
        
        if (this.isTelegram) {
            this.initTelegramUser();
            this.ui.setExitHandler(() => Telegram.WebApp.close());
        } else {
            this.ui.setExitHandler(() => alert("В Telegram будет закрытие игры"));
        }

        try {
            await this.connectToGame();
            this.ui.initUI();
        } catch (error) {
            this.ui.showError("Ошибка подключения к игре");
            console.error("Game init error:", error);
        }
    }

    detectEnvironment() {
        this.isTelegram = !!(window.Telegram && Telegram.WebApp);
    }

    initTelegramUser() {
        const tgUser = Telegram.WebApp.initDataUnsafe.user;
        if (tgUser) {
            this.currentPlayerId = tgUser.id.toString();
            this.ui.setCurrentPlayer({
                id: this.currentPlayerId,
                name: tgUser.first_name,
                photo: tgUser.photo_url
            });
        }
    }

    async connectToGame() {
        if (this.isTelegram) {
            this.socket.init(this.currentPlayerId, this.handleSocketMessage.bind(this));
        } else {
            // Режим разработки - эмуляция данных
            this.mockGameData();
        }
    }

    handleSocketMessage(message) {
        switch (message.type) {
            case 'game_state':
                this.updateGameState(message.data);
                break;
            case 'player_update':
                this.updatePlayer(message.data);
                break;
            case 'error':
                this.ui.showError(message.text);
                break;
        }
    }

    updateGameState(state) {
        this.gameState = state;
        this.ui.updateGameState(state);
    }

    updatePlayer(playerData) {
        this.ui.updatePlayer(playerData);
    }

    mockGameData() {
        // Эмуляция данных для разработки
        setInterval(() => {
            this.updateGameState({
                bankAmount: Math.floor(Math.random() * 5000),
                currentTurn: "Игрок " + Math.floor(Math.random() * 6 + 1),
                players: Array.from({length: 6}, (_, i) => ({
                    id: i + 1,
                    first_name: "Игрок " + (i + 1),
                    balance: Math.floor(Math.random() * 2000),
                    action: ["Ожидание", "Ставка", "Пас"][Math.floor(Math.random() * 3)],
                    is_current: i === 0
                }))
            });
        }, 3000);
    }

    placeBet(amount) {
        if (this.isTelegram) {
            this.socket.send('place_bet', { amount });
        } else {
            alert(`Ставка ${amount} (в Telegram будет отправлена)`);
        }
    }

    fold() {
        if (this.isTelegram) {
            this.socket.send('fold', {});
        } else {
            alert("Пас (в Telegram будет отправлен)");
        }
    }
}