import { ModalService } from '../services/modal.service.js';
import { SecurityService } from '../services/security.service.js';

export class ModalComponent {
    constructor() {
        this.modalService = new ModalService();
        this.securityService = new SecurityService();
        this.elements = {
            modalContainer: document.getElementById('modalContainer'),
            modalContent: document.getElementById('modalContent'),
            modalHeader: document.getElementById('modalHeader'),
            modalTitle: document.getElementById('modalTitle'),
            modalClose: document.getElementById('modalClose'),
            modalBody: document.getElementById('modalBody'),
            modalFooter: document.getElementById('modalFooter'),
            modalConfirm: document.getElementById('modalConfirm'),
            modalCancel: document.getElementById('modalCancel'),
            modalLoading: document.getElementById('modalLoading'),
            modalError: document.getElementById('modalError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadModal();
    }

    setupEventListeners() {
        // Обработка закрытия
        this.elements.modalClose?.addEventListener('click', () => {
            this.handleClose();
        });

        // Обработка подтверждения
        this.elements.modalConfirm?.addEventListener('click', () => {
            this.handleConfirm();
        });

        // Обработка отмены
        this.elements.modalCancel?.addEventListener('click', () => {
            this.handleCancel();
        });

        // Обработка клика вне модального окна
        this.elements.modalContainer?.addEventListener('click', (event) => {
            if (event.target === this.elements.modalContainer) {
                this.handleClose();
            }
        });

        // Обработка клавиши Escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.handleClose();
            }
        });
    }

    async loadModal() {
        try {
            this.showLoading();
            const data = await this.modalService.getModal();
            this.renderModal(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading modal:', error);
            this.showError();
            return false;
        }
    }

    handleClose() {
        this.modalService.handleClose();
    }

    async handleConfirm() {
        try {
            const data = this.modalService.getCurrentData();
            if (!data) return;

            const sanitizedData = this.securityService.sanitizeData(data);
            await this.modalService.handleConfirm(sanitizedData);
            TelegramUtils.showAlert('Действие подтверждено');
        } catch (error) {
            console.error('Error handling confirm:', error);
            TelegramUtils.showAlert('Ошибка при подтверждении действия');
        }
    }

    handleCancel() {
        this.modalService.handleCancel();
    }

    renderModal(data) {
        if (!this.elements.modalContainer) return;

        if (!data) {
            this.showError();
            return;
        }

        // Рендерим модальное окно
        this.renderModalTitle(data);
        this.renderModalContent(data);
        this.renderModalButtons(data);
    }

    renderModalTitle(data) {
        if (!this.elements.modalTitle) return;

        this.elements.modalTitle.textContent = data.title || 'Модальное окно';
    }

    renderModalContent(data) {
        if (!this.elements.modalBody) return;

        // Очищаем содержимое
        this.elements.modalBody.innerHTML = '';

        if (!data.content) return;

        // Рендерим содержимое
        const content = this.createModalContentElement(data.content);
        this.elements.modalBody.appendChild(content);
    }

    createModalContentElement(content) {
        const element = document.createElement('div');
        element.className = 'modal-content';

        // Текст
        if (content.text) {
            const text = document.createElement('div');
            text.className = 'modal-text';
            text.textContent = content.text;
            element.appendChild(text);
        }

        // HTML
        if (content.html) {
            const html = document.createElement('div');
            html.className = 'modal-html';
            html.innerHTML = content.html;
            element.appendChild(html);
        }

        // Компонент
        if (content.component) {
            const component = document.createElement('div');
            component.className = 'modal-component';
            component.id = content.component.id;
            element.appendChild(component);
        }

        return element;
    }

    renderModalButtons(data) {
        if (!this.elements.modalConfirm || !this.elements.modalCancel) return;

        // Кнопка подтверждения
        this.elements.modalConfirm.textContent = data.confirmText || 'Подтвердить';
        this.elements.modalConfirm.className = `modal-button confirm ${data.confirmClass || ''}`;

        // Кнопка отмены
        this.elements.modalCancel.textContent = data.cancelText || 'Отмена';
        this.elements.modalCancel.className = `modal-button cancel ${data.cancelClass || ''}`;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.modalLoading?.classList.remove('hidden');
        this.elements.modalContainer?.classList.add('hidden');
        this.elements.modalError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.modalLoading?.classList.add('hidden');
        this.elements.modalContainer?.classList.remove('hidden');
    }

    showError() {
        this.elements.modalError?.classList.remove('hidden');
        this.elements.modalContainer?.classList.add('hidden');
        this.elements.modalLoading?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.modalContainer) return;

        this.elements.modalContainer.setAttribute('aria-hidden', !accessible);
        this.elements.modalTitle?.setAttribute('aria-hidden', !accessible);
        this.elements.modalContent?.setAttribute('aria-hidden', !accessible);
        this.elements.modalClose?.setAttribute('aria-disabled', !accessible);
        this.elements.modalConfirm?.setAttribute('aria-disabled', !accessible);
        this.elements.modalCancel?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.modalClose?.removeEventListener('click', this.handleClose);
        this.elements.modalConfirm?.removeEventListener('click', this.handleConfirm);
        this.elements.modalCancel?.removeEventListener('click', this.handleCancel);
        this.elements.modalContainer?.removeEventListener('click', this.handleClose);
        document.removeEventListener('keydown', this.handleClose);
    }
} 