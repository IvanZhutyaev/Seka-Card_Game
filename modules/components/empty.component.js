import { EmptyService } from '../services/empty.service.js';

export class EmptyComponent {
    constructor() {
        this.emptyService = new EmptyService();
        this.elements = {
            emptyContainer: document.getElementById('emptyContainer'),
            emptyIcon: document.getElementById('emptyIcon'),
            emptyTitle: document.getElementById('emptyTitle'),
            emptyText: document.getElementById('emptyText'),
            emptyAction: document.getElementById('emptyAction'),
            emptyLoading: document.getElementById('emptyLoading'),
            emptyError: document.getElementById('emptyError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadEmpty();
    }

    setupEventListeners() {
        // Обработка действия
        this.elements.emptyAction?.addEventListener('click', () => {
            this.handleAction();
        });
    }

    async loadEmpty() {
        try {
            this.showLoading();
            const data = await this.emptyService.getEmpty();
            this.renderEmpty(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading empty:', error);
            this.showError();
            return false;
        }
    }

    async handleAction() {
        try {
            await this.emptyService.handleAction();
            TelegramUtils.showAlert('Действие выполнено');
        } catch (error) {
            console.error('Error handling action:', error);
            TelegramUtils.showAlert('Ошибка при выполнении действия');
        }
    }

    renderEmpty(data) {
        if (!this.elements.emptyContainer) return;

        if (!data) {
            this.showError();
            return;
        }

        // Рендерим пустое состояние
        this.renderEmptyIcon(data);
        this.renderEmptyTitle(data);
        this.renderEmptyText(data);
        this.renderEmptyAction(data);
    }

    renderEmptyIcon(data) {
        if (!this.elements.emptyIcon) return;

        this.elements.emptyIcon.textContent = data.icon || '📭';
    }

    renderEmptyTitle(data) {
        if (!this.elements.emptyTitle) return;

        this.elements.emptyTitle.textContent = data.title || 'Ничего не найдено';
    }

    renderEmptyText(data) {
        if (!this.elements.emptyText) return;

        this.elements.emptyText.textContent = data.text || 'Попробуйте изменить параметры поиска';
    }

    renderEmptyAction(data) {
        if (!this.elements.emptyAction) return;

        if (!data.action) {
            this.elements.emptyAction.classList.add('hidden');
            return;
        }

        this.elements.emptyAction.classList.remove('hidden');
        this.elements.emptyAction.textContent = data.action.text || 'Попробовать снова';
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.emptyLoading?.classList.remove('hidden');
        this.elements.emptyContainer?.classList.add('hidden');
        this.elements.emptyError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.emptyLoading?.classList.add('hidden');
        this.elements.emptyContainer?.classList.remove('hidden');
    }

    showError() {
        this.elements.emptyError?.classList.remove('hidden');
        this.elements.emptyContainer?.classList.add('hidden');
        this.elements.emptyLoading?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.emptyContainer) return;

        this.elements.emptyContainer.setAttribute('aria-hidden', !accessible);
        this.elements.emptyIcon?.setAttribute('aria-hidden', !accessible);
        this.elements.emptyTitle?.setAttribute('aria-hidden', !accessible);
        this.elements.emptyText?.setAttribute('aria-hidden', !accessible);
        this.elements.emptyAction?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.emptyAction?.removeEventListener('click', this.handleAction);
    }
} 