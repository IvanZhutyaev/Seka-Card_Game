import { GameService } from '../services/game.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class GameComponent {
    constructor() {
        this.gameService = new GameService();
        this.securityService = new SecurityService();
        this.elements = {
            gameContainer: document.getElementById('gameContainer'),
            gameTable: document.getElementById('gameTable'),
            gamePlayers: document.getElementById('gamePlayers'),
            gameCards: document.getElementById('gameCards'),
            gameDeck: document.getElementById('gameDeck'),
            gameDiscard: document.getElementById('gameDiscard'),
            gameTimer: document.getElementById('gameTimer'),
            gameScore: document.getElementById('gameScore'),
            gameActions: document.getElementById('gameActions'),
            gameChat: document.getElementById('gameChat'),
            gameSettings: document.getElementById('gameSettings'),
            gameLeave: document.getElementById('gameLeave'),
            gameEmpty: document.getElementById('gameEmpty'),
            gameLoading: document.getElementById('gameLoading'),
            gameError: document.getElementById('gameError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadGame();
    }

    setupEventListeners() {
        // Обработка действий игры
        this.elements.gameActions?.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
            if (action) {
                this.handleGameAction(action);
            }
        });

        // Обработка карт
        this.elements.gameCards?.addEventListener('click', (event) => {
            const card = event.target.closest('.game-card');
            if (card) {
                this.handleCardClick(card);
            }
        });

        // Обработка выхода
        this.elements.gameLeave?.addEventListener('click', () => {
            this.handleLeave();
        });

        // Обработка настроек
        this.elements.gameSettings?.addEventListener('click', () => {
            this.toggleSettings();
        });

        // Обработка чата
        this.elements.gameChat?.addEventListener('click', () => {
            this.toggleChat();
        });
    }

    async loadGame() {
        try {
            this.showLoading();
            const data = await this.gameService.getGame();
            this.renderGame(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading game:', error);
            this.showError();
            return false;
        }
    }

    async handleGameAction(action) {
        try {
            const sanitizedAction = this.securityService.sanitizeData(action);
            await this.gameService.performAction(sanitizedAction);
        } catch (error) {
            console.error('Error performing game action:', error);
            TelegramUtils.showAlert('Ошибка при выполнении действия');
        }
    }

    async handleCardClick(card) {
        try {
            const cardId = card.getAttribute('data-card-id');
            if (!cardId) return;

            const sanitizedCardId = this.securityService.sanitizeData(cardId);
            await this.gameService.playCard(sanitizedCardId);
        } catch (error) {
            console.error('Error handling card click:', error);
            TelegramUtils.showAlert('Ошибка при игре картой');
        }
    }

    async handleLeave() {
        try {
            const confirmed = await TelegramUtils.showConfirm('Вы уверены, что хотите покинуть игру?');
            if (confirmed) {
                await this.gameService.leaveGame();
                this.cleanup();
            }
        } catch (error) {
            console.error('Error leaving game:', error);
            TelegramUtils.showAlert('Ошибка при выходе из игры');
        }
    }

    toggleSettings() {
        // Здесь должна быть логика отображения/скрытия настроек
        console.log('Toggle settings');
    }

    toggleChat() {
        // Здесь должна быть логика отображения/скрытия чата
        console.log('Toggle chat');
    }

    renderGame(data) {
        if (!this.elements.gameTable) return;

        // Очищаем игровой стол
        this.elements.gameTable.innerHTML = '';

        if (!data) {
            this.showEmpty();
            return;
        }

        // Рендерим игроков
        this.renderPlayers(data.players);

        // Рендерим карты
        this.renderCards(data.cards);

        // Рендерим колоду и сброс
        this.renderDeck(data.deck);
        this.renderDiscard(data.discard);

        // Обновляем таймер и счет
        this.updateTimer(data.timer);
        this.updateScore(data.score);
    }

    renderPlayers(players) {
        if (!this.elements.gamePlayers) return;

        // Очищаем список игроков
        this.elements.gamePlayers.innerHTML = '';

        // Рендерим игроков
        players.forEach(player => {
            const playerElement = this.createPlayerElement(player);
            this.elements.gamePlayers.appendChild(playerElement);
        });
    }

    createPlayerElement(player) {
        const element = document.createElement('div');
        element.className = `game-player ${player.is_current ? 'current' : ''}`;
        element.setAttribute('data-player-id', player.id);

        // Аватар
        const avatar = document.createElement('img');
        avatar.className = 'game-avatar';
        avatar.src = player.photo_url || 'assets/images/default-avatar.png';
        avatar.alt = player.username;
        element.appendChild(avatar);

        // Информация
        const info = document.createElement('div');
        info.className = 'game-player-info';

        // Имя
        const username = document.createElement('div');
        username.className = 'game-username';
        username.textContent = player.username;
        info.appendChild(username);

        // Счет
        const score = document.createElement('div');
        score.className = 'game-score';
        score.textContent = player.score;
        info.appendChild(score);

        // Количество карт
        const cards = document.createElement('div');
        cards.className = 'game-cards-count';
        cards.textContent = `${player.cards_count} карт`;
        info.appendChild(cards);

        element.appendChild(info);
        return element;
    }

    renderCards(cards) {
        if (!this.elements.gameCards) return;

        // Очищаем карты
        this.elements.gameCards.innerHTML = '';

        // Рендерим карты
        cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            this.elements.gameCards.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const element = document.createElement('div');
        element.className = 'game-card';
        element.setAttribute('data-card-id', card.id);

        // Изображение карты
        const image = document.createElement('img');
        image.src = card.image_url;
        image.alt = card.name;
        element.appendChild(image);

        return element;
    }

    renderDeck(deck) {
        if (!this.elements.gameDeck) return;

        // Очищаем колоду
        this.elements.gameDeck.innerHTML = '';

        // Рендерим колоду
        const element = document.createElement('div');
        element.className = 'game-deck';

        // Количество карт
        const count = document.createElement('div');
        count.className = 'game-deck-count';
        count.textContent = deck.cards_count;
        element.appendChild(count);

        this.elements.gameDeck.appendChild(element);
    }

    renderDiscard(discard) {
        if (!this.elements.gameDiscard) return;

        // Очищаем сброс
        this.elements.gameDiscard.innerHTML = '';

        // Рендерим сброс
        const element = document.createElement('div');
        element.className = 'game-discard';

        // Последняя карта
        if (discard.last_card) {
            const card = this.createCardElement(discard.last_card);
            element.appendChild(card);
        }

        this.elements.gameDiscard.appendChild(element);
    }

    updateTimer(timer) {
        if (!this.elements.gameTimer) return;

        this.elements.gameTimer.textContent = Utils.formatTime(timer);
    }

    updateScore(score) {
        if (!this.elements.gameScore) return;

        this.elements.gameScore.textContent = score;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.gameLoading?.classList.remove('hidden');
        this.elements.gameTable?.classList.add('hidden');
        this.elements.gameEmpty?.classList.add('hidden');
        this.elements.gameError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.gameLoading?.classList.add('hidden');
        this.elements.gameTable?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.gameEmpty?.classList.remove('hidden');
        this.elements.gameTable?.classList.add('hidden');
        this.elements.gameLoading?.classList.add('hidden');
        this.elements.gameError?.classList.add('hidden');
    }

    showError() {
        this.elements.gameError?.classList.remove('hidden');
        this.elements.gameTable?.classList.add('hidden');
        this.elements.gameLoading?.classList.add('hidden');
        this.elements.gameEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.gameContainer) return;

        this.elements.gameContainer.setAttribute('aria-hidden', !accessible);
        this.elements.gameActions?.setAttribute('aria-disabled', !accessible);
        this.elements.gameCards?.setAttribute('aria-disabled', !accessible);
        this.elements.gameLeave?.setAttribute('aria-disabled', !accessible);
        this.elements.gameSettings?.setAttribute('aria-disabled', !accessible);
        this.elements.gameChat?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.gameActions?.removeEventListener('click', this.handleGameAction);
        this.elements.gameCards?.removeEventListener('click', this.handleCardClick);
        this.elements.gameLeave?.removeEventListener('click', this.handleLeave);
        this.elements.gameSettings?.removeEventListener('click', this.toggleSettings);
        this.elements.gameChat?.removeEventListener('click', this.toggleChat);
    }
} 