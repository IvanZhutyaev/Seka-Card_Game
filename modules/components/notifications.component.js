import { NotificationsService } from '../services/notifications.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class NotificationsComponent {
    constructor() {
        this.notificationsService = new NotificationsService();
        this.securityService = new SecurityService();
        this.elements = {
            notificationsContainer: document.getElementById('notificationsContainer'),
            notificationsList: document.getElementById('notificationsList'),
            notificationsEmpty: document.getElementById('notificationsEmpty'),
            notificationsLoading: document.getElementById('notificationsLoading'),
            notificationsError: document.getElementById('notificationsError'),
            notificationsClear: document.getElementById('notificationsClear'),
            notificationsMarkAll: document.getElementById('notificationsMarkAll')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotifications();
    }

    setupEventListeners() {
        // Обработка очистки
        this.elements.notificationsClear?.addEventListener('click', () => {
            this.clearNotifications();
        });

        // Обработка отметки всех
        this.elements.notificationsMarkAll?.addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Обработка клика по уведомлению
        this.elements.notificationsList?.addEventListener('click', (event) => {
            const notification = event.target.closest('.notification');
            if (notification) {
                this.handleNotificationClick(notification);
            }
        });
    }

    async loadNotifications() {
        try {
            this.showLoading();
            const data = await this.notificationsService.getNotifications();
            this.renderNotifications(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showError();
            return false;
        }
    }

    async clearNotifications() {
        try {
            const confirmed = await TelegramUtils.showConfirm('Вы уверены, что хотите очистить все уведомления?');
            if (confirmed) {
                await this.notificationsService.clearNotifications();
                await this.loadNotifications();
                TelegramUtils.showAlert('Уведомления очищены');
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            TelegramUtils.showAlert('Ошибка при очистке уведомлений');
        }
    }

    async markAllAsRead() {
        try {
            await this.notificationsService.markAllAsRead();
            await this.loadNotifications();
            TelegramUtils.showAlert('Все уведомления отмечены как прочитанные');
        } catch (error) {
            console.error('Error marking all as read:', error);
            TelegramUtils.showAlert('Ошибка при отметке уведомлений');
        }
    }

    async handleNotificationClick(notification) {
        try {
            const notificationId = notification.getAttribute('data-notification-id');
            if (!notificationId) return;

            const sanitizedId = this.securityService.sanitizeData(notificationId);
            await this.notificationsService.markAsRead(sanitizedId);
            await this.notificationsService.handleNotification(sanitizedId);
        } catch (error) {
            console.error('Error handling notification click:', error);
            TelegramUtils.showAlert('Ошибка при обработке уведомления');
        }
    }

    renderNotifications(data) {
        if (!this.elements.notificationsList) return;

        // Очищаем список
        this.elements.notificationsList.innerHTML = '';

        if (!data || data.length === 0) {
            this.showEmpty();
            return;
        }

        // Рендерим уведомления
        data.forEach(notification => {
            const element = this.createNotificationElement(notification);
            this.elements.notificationsList.appendChild(element);
        });
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.is_read ? 'read' : 'unread'}`;
        element.setAttribute('data-notification-id', notification.id);

        // Иконка
        const icon = document.createElement('span');
        icon.className = 'notification-icon';
        icon.textContent = notification.icon;
        element.appendChild(icon);

        // Контент
        const content = document.createElement('div');
        content.className = 'notification-content';

        // Заголовок
        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = notification.title;
        content.appendChild(title);

        // Текст
        const text = document.createElement('div');
        text.className = 'notification-text';
        text.textContent = notification.text;
        content.appendChild(text);

        // Время
        const time = document.createElement('div');
        time.className = 'notification-time';
        time.textContent = Utils.formatTime(notification.timestamp);
        content.appendChild(time);

        element.appendChild(content);
        return element;
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.notificationsLoading?.classList.remove('hidden');
        this.elements.notificationsList?.classList.add('hidden');
        this.elements.notificationsEmpty?.classList.add('hidden');
        this.elements.notificationsError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.notificationsLoading?.classList.add('hidden');
        this.elements.notificationsList?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.notificationsEmpty?.classList.remove('hidden');
        this.elements.notificationsList?.classList.add('hidden');
        this.elements.notificationsLoading?.classList.add('hidden');
        this.elements.notificationsError?.classList.add('hidden');
    }

    showError() {
        this.elements.notificationsError?.classList.remove('hidden');
        this.elements.notificationsList?.classList.add('hidden');
        this.elements.notificationsLoading?.classList.add('hidden');
        this.elements.notificationsEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.notificationsContainer) return;

        this.elements.notificationsContainer.setAttribute('aria-hidden', !accessible);
        this.elements.notificationsList?.setAttribute('aria-hidden', !accessible);
        this.elements.notificationsClear?.setAttribute('aria-disabled', !accessible);
        this.elements.notificationsMarkAll?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.notificationsClear?.removeEventListener('click', this.clearNotifications);
        this.elements.notificationsMarkAll?.removeEventListener('click', this.markAllAsRead);
        this.elements.notificationsList?.removeEventListener('click', this.handleNotificationClick);
    }
} 