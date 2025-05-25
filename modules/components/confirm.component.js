import { ConfirmService } from '../services/confirm.service.js';
import { SecurityService } from '../services/security.service.js';

export class ConfirmComponent {
    constructor() {
        this.confirmService = new ConfirmService();
        this.securityService = new SecurityService();
        this.elements = {
            confirmContainer: document.getElementById('confirmContainer'),
            confirmTitle: document.getElementById('confirmTitle'),
            confirmText: document.getElementById('confirmText'),
            confirmIcon: document.getElementById('confirmIcon'),
            confirmConfirm: document.getElementById('confirmConfirm'),
            confirmCancel: document.getElementById('confirmCancel'),
            confirmLoading: document.getElementById('confirmLoading'),
            confirmError: document.getElementById('confirmError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadConfirm();
    }

    setupEventListeners() {
        // Обработка подтверждения
        this.elements.confirmConfirm?.addEventListener('click', () => {
            this.handleConfirm();
        });

        // Обработка отмены
        this.elements.confirmCancel?.addEventListener('click', () => {
            this.handleCancel();
        });
    }

    async loadConfirm() {
        try {
            this.showLoading();
            const data = await this.confirmService.getConfirm();
            this.renderConfirm(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading confirm:', error);
            this.showError();
            return false;
        }
    }

    async handleConfirm() {
        try {
            const data = this.confirmService.getCurrentData();
            if (!data) return;

            const sanitizedData = this.securityService.sanitizeData(data);
            await this.confirmService.handleConfirm(sanitizedData);
            TelegramUtils.showAlert('Действие подтверждено');
        } catch (error) {
            console.error('Error handling confirm:', error);
            TelegramUtils.showAlert('Ошибка при подтверждении действия');
        }
    }

    handleCancel() {
        this.confirmService.handleCancel();
    }

    renderConfirm(data) {
        if (!this.elements.confirmContainer) return;

        if (!data) {
            this.showError();
            return;
        }

        // Рендерим подтверждение
        this.renderConfirmTitle(data);
        this.renderConfirmText(data);
        this.renderConfirmIcon(data);
        this.renderConfirmButtons(data);
    }

    renderConfirmTitle(data) {
        if (!this.elements.confirmTitle) return;

        this.elements.confirmTitle.textContent = data.title || 'Подтверждение';
    }

    renderConfirmText(data) {
        if (!this.elements.confirmText) return;

        this.elements.confirmText.textContent = data.text || 'Вы уверены, что хотите выполнить это действие?';
    }

    renderConfirmIcon(data) {
        if (!this.elements.confirmIcon) return;

        this.elements.confirmIcon.textContent = data.icon || '⚠️';
    }

    renderConfirmButtons(data) {
        if (!this.elements.confirmConfirm || !this.elements.confirmCancel) return;

        // Кнопка подтверждения
        this.elements.confirmConfirm.textContent = data.confirmText || 'Подтвердить';
        this.elements.confirmConfirm.className = `confirm-button confirm ${data.confirmClass || ''}`;

        // Кнопка отмены
        this.elements.confirmCancel.textContent = data.cancelText || 'Отмена';
        this.elements.confirmCancel.className = `confirm-button cancel ${data.cancelClass || ''}`;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.confirmLoading?.classList.remove('hidden');
        this.elements.confirmContainer?.classList.add('hidden');
        this.elements.confirmError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.confirmLoading?.classList.add('hidden');
        this.elements.confirmContainer?.classList.remove('hidden');
    }

    showError() {
        this.elements.confirmError?.classList.remove('hidden');
        this.elements.confirmContainer?.classList.add('hidden');
        this.elements.confirmLoading?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.confirmContainer) return;

        this.elements.confirmContainer.setAttribute('aria-hidden', !accessible);
        this.elements.confirmTitle?.setAttribute('aria-hidden', !accessible);
        this.elements.confirmText?.setAttribute('aria-hidden', !accessible);
        this.elements.confirmIcon?.setAttribute('aria-hidden', !accessible);
        this.elements.confirmConfirm?.setAttribute('aria-disabled', !accessible);
        this.elements.confirmCancel?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.confirmConfirm?.removeEventListener('click', this.handleConfirm);
        this.elements.confirmCancel?.removeEventListener('click', this.handleCancel);
    }
} 