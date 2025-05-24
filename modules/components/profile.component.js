import { Utils } from '../utils.js';

export class ProfileComponent {
    constructor(services, eventBus) {
        this.services = services;
        this.eventBus = eventBus;
        this.profileService = services.profile;
        this.securityService = services.security;
        this.elements = {
            avatar: document.getElementById('avatar'),
            avatarText: document.getElementById('avatar-text'),
            username: document.getElementById('username'),
            userId: document.getElementById('user-id'),
            balance: document.getElementById('balance'),
            gamesPlayed: document.getElementById('games-played'),
            gamesWon: document.getElementById('games-won'),
            winRate: document.getElementById('win-rate'),
            totalWinnings: document.getElementById('total-winnings'),
            notificationsToggle: document.getElementById('notifications-toggle'),
            soundsToggle: document.getElementById('sounds-toggle')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadProfile();
    }

    setupEventListeners() {
        // Обработка переключателей
        this.elements.notificationsToggle?.addEventListener('change', (event) => {
            this.updateSettings({ notifications: event.target.checked });
        });

        this.elements.soundsToggle?.addEventListener('change', (event) => {
            this.updateSettings({ sounds: event.target.checked });
        });

        // Обработка клика по аватару
        this.elements.avatar?.addEventListener('click', () => {
            this.handleAvatarClick();
        });
    }

    async loadProfile() {
        try {
            await this.profileService.loadProfile();
            return true;
        } catch (error) {
            console.error('Error loading profile:', error);
            return false;
        }
    }

    async updateProfile(user) {
        try {
            const sanitizedUser = this.securityService.sanitizeData(user);
            await this.profileService.updateProfile(sanitizedUser);
            this.eventBus?.emit('profile:updated', sanitizedUser);
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }

    async updateStats(stats) {
        try {
            const sanitizedStats = this.securityService.sanitizeData(stats);
            await this.profileService.updateStats(sanitizedStats);
            return true;
        } catch (error) {
            console.error('Error updating stats:', error);
            return false;
        }
    }

    async updateSettings(settings) {
        try {
            const sanitizedSettings = this.securityService.sanitizeData(settings);
            await this.profileService.updateSettings(sanitizedSettings);
            this.eventBus?.emit('profile:settings-updated', sanitizedSettings);
            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }

    async handleAvatarClick() {
        try {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';

            fileInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    const validatedFile = await this.securityService.validateFile(file);
                    await this.uploadAvatar(validatedFile);
                } catch (error) {
                    console.error('Error handling avatar upload:', error);
                    TelegramUtils.showAlert('Ошибка при загрузке аватара');
                } finally {
                    document.body.removeChild(fileInput);
                }
            });

            document.body.appendChild(fileInput);
            fileInput.click();
        } catch (error) {
            console.error('Error handling avatar click:', error);
        }
    }

    async uploadAvatar(file) {
        try {
            const user = this.services.storage.getUserData();
            if (user) {
                user.photo_url = URL.createObjectURL(file.file);
                await this.updateProfile(user);
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }

    // Методы для работы с балансом
    updateBalance(amount) {
        if (this.elements.balance) {
            this.elements.balance.textContent = Utils.formatCurrency(amount);
        }
    }

    // Методы для работы с настройками
    getSettings() {
        return {
            notifications: this.elements.notificationsToggle?.checked ?? true,
            sounds: this.elements.soundsToggle?.checked ?? true
        };
    }

    // Методы для работы с DOM
    show() {
        this.elements.avatar?.classList.remove('hidden');
        this.elements.username?.classList.remove('hidden');
        this.elements.userId?.classList.remove('hidden');
    }

    hide() {
        this.elements.avatar?.classList.add('hidden');
        this.elements.username?.classList.add('hidden');
        this.elements.userId?.classList.add('hidden');
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.notificationsToggle?.removeEventListener('change', this.updateSettings);
        this.elements.soundsToggle?.removeEventListener('change', this.updateSettings);
        this.elements.avatar?.removeEventListener('click', this.handleAvatarClick);
    }
} 