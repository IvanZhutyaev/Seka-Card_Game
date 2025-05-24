import { ErrorService } from '../services/error.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class ErrorComponent {
    constructor() {
        this.errorService = new ErrorService();
        this.securityService = new SecurityService();
        this.elements = {
            errorContainer: document.getElementById('errorContainer'),
            errorMessage: document.getElementById('errorMessage'),
            errorCode: document.getElementById('errorCode'),
            errorDetails: document.getElementById('errorDetails'),
            errorRetry: document.getElementById('errorRetry'),
            errorBack: document.getElementById('errorBack'),
            errorReport: document.getElementById('errorReport'),
            errorEmpty: document.getElementById('errorEmpty'),
            errorLoading: document.getElementById('errorLoading')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadError();
    }

    setupEventListeners() {
        // Обработка повторной попытки
        this.elements.errorRetry?.addEventListener('click', () => {
            this.retry();
        });

        // Обработка возврата
        this.elements.errorBack?.addEventListener('click', () => {
            this.goBack();
        });

        // Обработка отправки отчета
        this.elements.errorReport?.addEventListener('click', () => {
            this.reportError();
        });
    }

    async loadError() {
        try {
            this.showLoading();
            const data = await this.errorService.getError();
            this.renderError(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading error:', error);
            this.showEmpty();
            return false;
        }
    }

    async retry() {
        try {
            await this.errorService.retry();
            window.location.reload();
        } catch (error) {
            console.error('Error retrying:', error);
            TelegramUtils.showAlert('Ошибка при повторной попытке');
        }
    }

    goBack() {
        window.history.back();
    }

    async reportError() {
        try {
            const error = this.errorService.getCurrentError();
            if (!error) return;

            const sanitizedError = this.securityService.sanitizeData(error);
            await this.errorService.reportError(sanitizedError);
            TelegramUtils.showAlert('Отчет об ошибке отправлен');
        } catch (error) {
            console.error('Error reporting error:', error);
            TelegramUtils.showAlert('Ошибка при отправке отчета');
        }
    }

    renderError(data) {
        if (!this.elements.errorContainer) return;

        if (!data) {
            this.showEmpty();
            return;
        }

        // Рендерим ошибку
        this.renderErrorMessage(data);
        this.renderErrorCode(data);
        this.renderErrorDetails(data);
    }

    renderErrorMessage(data) {
        if (!this.elements.errorMessage) return;

        this.elements.errorMessage.textContent = data.message || 'Произошла ошибка';
    }

    renderErrorCode(data) {
        if (!this.elements.errorCode) return;

        this.elements.errorCode.textContent = data.code || 'UNKNOWN_ERROR';
    }

    renderErrorDetails(data) {
        if (!this.elements.errorDetails) return;

        // Очищаем детали
        this.elements.errorDetails.innerHTML = '';

        if (!data.details) return;

        // Рендерим детали
        const details = this.createErrorDetailsElement(data.details);
        this.elements.errorDetails.appendChild(details);
    }

    createErrorDetailsElement(details) {
        const element = document.createElement('div');
        element.className = 'error-details';

        // Время
        const time = document.createElement('div');
        time.className = 'error-time';
        time.textContent = Utils.formatTime(details.timestamp);
        element.appendChild(time);

        // URL
        const url = document.createElement('div');
        url.className = 'error-url';
        url.textContent = details.url;
        element.appendChild(url);

        // Стек
        if (details.stack) {
            const stack = document.createElement('div');
            stack.className = 'error-stack';
            stack.textContent = details.stack;
            element.appendChild(stack);
        }

        return element;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.errorLoading?.classList.remove('hidden');
        this.elements.errorContainer?.classList.add('hidden');
        this.elements.errorEmpty?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.errorLoading?.classList.add('hidden');
        this.elements.errorContainer?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.errorEmpty?.classList.remove('hidden');
        this.elements.errorContainer?.classList.add('hidden');
        this.elements.errorLoading?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.errorContainer) return;

        this.elements.errorContainer.setAttribute('aria-hidden', !accessible);
        this.elements.errorRetry?.setAttribute('aria-disabled', !accessible);
        this.elements.errorBack?.setAttribute('aria-disabled', !accessible);
        this.elements.errorReport?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.errorRetry?.removeEventListener('click', this.retry);
        this.elements.errorBack?.removeEventListener('click', this.goBack);
        this.elements.errorReport?.removeEventListener('click', this.reportError);
    }
} 