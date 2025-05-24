import { LeaderboardService } from '../services/leaderboard.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class LeaderboardComponent {
    constructor() {
        this.leaderboardService = new LeaderboardService();
        this.securityService = new SecurityService();
        this.elements = {
            leaderboardTable: document.getElementById('leaderboardTable'),
            leaderboardBody: document.getElementById('leaderboardBody'),
            leaderboardHeader: document.getElementById('leaderboardHeader'),
            leaderboardFooter: document.getElementById('leaderboardFooter'),
            leaderboardEmpty: document.getElementById('leaderboardEmpty'),
            leaderboardLoading: document.getElementById('leaderboardLoading'),
            leaderboardError: document.getElementById('leaderboardError'),
            leaderboardRefresh: document.getElementById('leaderboardRefresh'),
            leaderboardFilter: document.getElementById('leaderboardFilter'),
            leaderboardSort: document.getElementById('leaderboardSort'),
            leaderboardSearch: document.getElementById('leaderboardSearch'),
            leaderboardPagination: document.getElementById('leaderboardPagination')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadLeaderboard();
    }

    setupEventListeners() {
        // Обработка обновления
        this.elements.leaderboardRefresh?.addEventListener('click', () => {
            this.refreshLeaderboard();
        });

        // Обработка фильтрации
        this.elements.leaderboardFilter?.addEventListener('change', (event) => {
            this.filterLeaderboard(event.target.value);
        });

        // Обработка сортировки
        this.elements.leaderboardSort?.addEventListener('change', (event) => {
            this.sortLeaderboard(event.target.value);
        });

        // Обработка поиска
        this.elements.leaderboardSearch?.addEventListener('input', (event) => {
            this.searchLeaderboard(event.target.value);
        });

        // Обработка пагинации
        this.elements.leaderboardPagination?.addEventListener('click', (event) => {
            const page = event.target.getAttribute('data-page');
            if (page) {
                this.changePage(parseInt(page));
            }
        });
    }

    async loadLeaderboard() {
        try {
            this.showLoading();
            const data = await this.leaderboardService.getLeaderboard();
            this.renderLeaderboard(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showError();
            return false;
        }
    }

    async refreshLeaderboard() {
        try {
            this.showLoading();
            const data = await this.leaderboardService.refreshLeaderboard();
            this.renderLeaderboard(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error refreshing leaderboard:', error);
            this.showError();
            return false;
        }
    }

    filterLeaderboard(filter) {
        const sanitizedFilter = this.securityService.sanitizeData(filter);
        this.leaderboardService.setFilter(sanitizedFilter);
        this.loadLeaderboard();
    }

    sortLeaderboard(sort) {
        const sanitizedSort = this.securityService.sanitizeData(sort);
        this.leaderboardService.setSort(sanitizedSort);
        this.loadLeaderboard();
    }

    searchLeaderboard(query) {
        const sanitizedQuery = this.securityService.sanitizeData(query);
        this.leaderboardService.setSearch(sanitizedQuery);
        this.loadLeaderboard();
    }

    changePage(page) {
        this.leaderboardService.setPage(page);
        this.loadLeaderboard();
    }

    renderLeaderboard(data) {
        if (!this.elements.leaderboardBody) return;

        // Очищаем таблицу
        this.elements.leaderboardBody.innerHTML = '';

        if (!data || data.length === 0) {
            this.showEmpty();
            return;
        }

        // Рендерим данные
        data.forEach((item, index) => {
            const row = this.createLeaderboardRow(item, index + 1);
            this.elements.leaderboardBody.appendChild(row);
        });

        // Обновляем пагинацию
        this.updatePagination();
    }

    createLeaderboardRow(item, index) {
        const row = document.createElement('tr');
        row.className = 'leaderboard-row';
        row.setAttribute('data-user-id', item.user_id);

        // Позиция
        const positionCell = document.createElement('td');
        positionCell.className = 'leaderboard-position';
        positionCell.textContent = index;
        row.appendChild(positionCell);

        // Аватар
        const avatarCell = document.createElement('td');
        avatarCell.className = 'leaderboard-avatar';
        const avatar = document.createElement('img');
        avatar.src = item.photo_url || 'assets/images/default-avatar.png';
        avatar.alt = item.username;
        avatarCell.appendChild(avatar);
        row.appendChild(avatarCell);

        // Имя пользователя
        const usernameCell = document.createElement('td');
        usernameCell.className = 'leaderboard-username';
        usernameCell.textContent = item.username;
        row.appendChild(usernameCell);

        // Рейтинг
        const ratingCell = document.createElement('td');
        ratingCell.className = 'leaderboard-rating';
        ratingCell.textContent = item.rating;
        row.appendChild(ratingCell);

        // Выигрыши
        const winningsCell = document.createElement('td');
        winningsCell.className = 'leaderboard-winnings';
        winningsCell.textContent = Utils.formatCurrency(item.total_winnings);
        row.appendChild(winningsCell);

        // Процент побед
        const winRateCell = document.createElement('td');
        winRateCell.className = 'leaderboard-winrate';
        winRateCell.textContent = `${item.win_rate}%`;
        row.appendChild(winRateCell);

        return row;
    }

    updatePagination() {
        if (!this.elements.leaderboardPagination) return;

        const { currentPage, totalPages } = this.leaderboardService.getPagination();
        
        // Очищаем пагинацию
        this.elements.leaderboardPagination.innerHTML = '';

        // Добавляем кнопки пагинации
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
            button.textContent = i;
            button.setAttribute('data-page', i);
            this.elements.leaderboardPagination.appendChild(button);
        }
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.leaderboardLoading?.classList.remove('hidden');
        this.elements.leaderboardTable?.classList.add('hidden');
        this.elements.leaderboardEmpty?.classList.add('hidden');
        this.elements.leaderboardError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.leaderboardLoading?.classList.add('hidden');
        this.elements.leaderboardTable?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.leaderboardEmpty?.classList.remove('hidden');
        this.elements.leaderboardTable?.classList.add('hidden');
        this.elements.leaderboardLoading?.classList.add('hidden');
        this.elements.leaderboardError?.classList.add('hidden');
    }

    showError() {
        this.elements.leaderboardError?.classList.remove('hidden');
        this.elements.leaderboardTable?.classList.add('hidden');
        this.elements.leaderboardLoading?.classList.add('hidden');
        this.elements.leaderboardEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.leaderboardTable) return;

        this.elements.leaderboardTable.setAttribute('aria-hidden', !accessible);
        this.elements.leaderboardRefresh?.setAttribute('aria-disabled', !accessible);
        this.elements.leaderboardFilter?.setAttribute('aria-disabled', !accessible);
        this.elements.leaderboardSort?.setAttribute('aria-disabled', !accessible);
        this.elements.leaderboardSearch?.setAttribute('aria-disabled', !accessible);
        this.elements.leaderboardPagination?.setAttribute('aria-hidden', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.leaderboardRefresh?.removeEventListener('click', this.refreshLeaderboard);
        this.elements.leaderboardFilter?.removeEventListener('change', this.filterLeaderboard);
        this.elements.leaderboardSort?.removeEventListener('change', this.sortLeaderboard);
        this.elements.leaderboardSearch?.removeEventListener('input', this.searchLeaderboard);
        this.elements.leaderboardPagination?.removeEventListener('click', this.changePage);
    }
} 