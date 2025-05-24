import { Utils } from '../utils.js';
import { ImageService } from './image.service.js';
import { StorageService } from './storage.service.js';

export class ProfileService {
    constructor() {
        console.log('ProfileService initialized');
        this.imageService = new ImageService();
        this.storageService = new StorageService();
    }

    async updateProfile(user) {
        if (!Utils.validateUser(user)) {
            console.error('Invalid user data');
            return false;
        }

        try {
            const avatar = document.getElementById('avatar');
            const avatarText = document.getElementById('avatar-text');
            const username = document.getElementById('username');
            const userId = document.getElementById('user-id');

            if (!avatar || !avatarText || !username || !userId) {
                throw new Error('Required DOM elements not found');
            }

            // Обновляем аватар
            const avatarUrl = await this.imageService.loadAvatar(user);
            if (avatarUrl) {
                avatar.style.backgroundImage = `url(${avatarUrl})`;
                avatarText.style.display = 'none';
            } else {
                avatarText.textContent = user.first_name.charAt(0);
            }

            // Обновляем информацию пользователя
            username.textContent = Utils.sanitizeHTML(user.first_name);
            userId.textContent = `ID: ${Utils.sanitizeHTML(user.id.toString())}`;

            // Сохраняем данные пользователя
            this.storageService.setUserData(user);

            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            return false;
        }
    }

    async updateStats(stats) {
        try {
            const gamesPlayed = document.getElementById('games-played');
            const gamesWon = document.getElementById('games-won');
            const winRate = document.getElementById('win-rate');
            const totalWinnings = document.getElementById('total-winnings');

            if (!gamesPlayed || !gamesWon || !winRate || !totalWinnings) {
                throw new Error('Required DOM elements not found');
            }

            gamesPlayed.textContent = stats.gamesPlayed || 0;
            gamesWon.textContent = stats.gamesWon || 0;
            winRate.textContent = `${stats.winRate || 0}%`;
            totalWinnings.textContent = Utils.formatCurrency(stats.totalWinnings || 0);

            // Сохраняем статистику
            this.storageService.set('stats', stats);

            return true;
        } catch (error) {
            console.error('Error updating stats:', error);
            return false;
        }
    }

    async updateSettings(settings) {
        try {
            const notificationsToggle = document.getElementById('notifications-toggle');
            const soundsToggle = document.getElementById('sounds-toggle');

            if (!notificationsToggle || !soundsToggle) {
                throw new Error('Required DOM elements not found');
            }

            notificationsToggle.checked = settings.notifications ?? true;
            soundsToggle.checked = settings.sounds ?? true;

            // Сохраняем настройки
            this.storageService.setSettings(settings);

            return true;
        } catch (error) {
            console.error('Error updating settings:', error);
            return false;
        }
    }

    async loadProfile() {
        try {
            const userData = this.storageService.getUserData();
            const stats = this.storageService.get('stats');
            const settings = this.storageService.getSettings();

            if (userData) {
                await this.updateProfile(userData);
            }

            if (stats) {
                await this.updateStats(stats);
            }

            if (settings) {
                await this.updateSettings(settings);
            }

            return true;
        } catch (error) {
            console.error('Error loading profile:', error);
            return false;
        }
    }

    async clearProfile() {
        try {
            this.storageService.remove('userData');
            this.storageService.remove('stats');
            this.storageService.remove('settings');
            this.imageService.clearCache();

            return true;
        } catch (error) {
            console.error('Error clearing profile:', error);
            return false;
        }
    }
} 