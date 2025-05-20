class GameController {
    constructor(uiManager, socketHandler) {
        this.ui = uiManager;
        this.socket = socketHandler;
        this.tgUser = null;
        this.gameState = {
            players: [],
            bankAmount: 0,
            currentTurn: null,
            playerSlots: 6
        };
    }

    async init() {
        this.tgUser = this.ui.initTelegramWebApp();
        this.socket.init(this.tgUser?.id, this.handleSocketMessage.bind(this));
        await this.loadInitialData();
    }

    async loadInitialData() {
        try {
            const response = await fetch('/get_game_state');
            const gameState = await response.json();
            this.updateGameState(gameState);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    handleSocketMessage(data) {
        switch (data.type) {
            case 'game_state':
                this.updateGameState(data.data);
                break;
            case 'player_update':
                this.ui.updatePlayer(data.data);
                break;
            case 'new_message':
                this.ui.showGameMessage(data.message);
                break;
        }
    }

    updateGameState(state) {
        this.gameState = { ...this.gameState, ...state };
        this.ui.updateUI(this.gameState);
    }
}