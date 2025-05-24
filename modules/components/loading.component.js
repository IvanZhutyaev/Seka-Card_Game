import { LoadingService } from '../services/loading.service.js';
import { Utils } from '../utils.js';

export class LoadingComponent {
    constructor() {
        this.loadingService = new LoadingService();
        this.elements = {
            loadingContainer: document.getElementById('loadingContainer'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            loadingText: document.getElementById('loadingText'),
            loadingProgress: document.getElementById('loadingProgress'),
            loadingEmpty: document.getElementById('loadingEmpty'),
            loadingError: document.getElementById('loadingError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadLoading();
    }

    setupEventListeners() {
        // Обработка прогресса
        this.loadingService.onProgress((progress) => {
            this.updateProgress(progress);
        });

        // Обработка ошибки
        this.loadingService.onError((error) => {
            this.showError(error);
        });
    }

    async loadLoading() {
        try {
            this.showLoading();
            const data = await this.loadingService.getLoading();
            this.renderLoading(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading loading:', error);
            this.showError();
            return false;
        }
    }

    updateProgress(progress) {
        if (!this.elements.loadingProgress) return;

        // Обновляем прогресс
        this.elements.loadingProgress.value = progress;
        this.elements.loadingProgress.textContent = `${progress}%`;
    }

    renderLoading(data) {
        if (!this.elements.loadingContainer) return;

        if (!data) {
            this.showEmpty();
            return;
        }

        // Рендерим загрузку
        this.renderLoadingText(data);
        this.renderLoadingProgress(data);
    }

    renderLoadingText(data) {
        if (!this.elements.loadingText) return;

        this.elements.loadingText.textContent = data.text || 'Загрузка...';
    }

    renderLoadingProgress(data) {
        if (!this.elements.loadingProgress) return;

        // Обновляем прогресс
        this.updateProgress(data.progress || 0);
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.loadingContainer?.classList.remove('hidden');
        this.elements.loadingEmpty?.classList.add('hidden');
        this.elements.loadingError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.loadingContainer?.classList.add('hidden');
    }

    showEmpty() {
        this.elements.loadingEmpty?.classList.remove('hidden');
        this.elements.loadingContainer?.classList.add('hidden');
        this.elements.loadingError?.classList.add('hidden');
    }

    showError(error) {
        if (!this.elements.loadingError) return;

        this.elements.loadingError.classList.remove('hidden');
        this.elements.loadingContainer?.classList.add('hidden');
        this.elements.loadingEmpty?.classList.add('hidden');

        // Устанавливаем текст ошибки
        const errorText = this.elements.loadingError.querySelector('.error-text');
        if (errorText) {
            errorText.textContent = error?.message || 'Произошла ошибка';
        }
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.loadingContainer) return;

        this.elements.loadingContainer.setAttribute('aria-hidden', !accessible);
        this.elements.loadingSpinner?.setAttribute('aria-hidden', !accessible);
        this.elements.loadingText?.setAttribute('aria-hidden', !accessible);
        this.elements.loadingProgress?.setAttribute('aria-hidden', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.loadingService.offProgress();
        this.loadingService.offError();
    }
} 