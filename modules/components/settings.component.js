import { SettingsService } from '../services/settings.service.js';
import { SecurityService } from '../services/security.service.js';
import { Utils } from '../utils.js';

export class SettingsComponent {
    constructor() {
        this.settingsService = new SettingsService();
        this.securityService = new SecurityService();
        this.elements = {
            settingsContainer: document.getElementById('settingsContainer'),
            settingsForm: document.getElementById('settingsForm'),
            settingsTheme: document.getElementById('settingsTheme'),
            settingsLanguage: document.getElementById('settingsLanguage'),
            settingsNotifications: document.getElementById('settingsNotifications'),
            settingsSounds: document.getElementById('settingsSounds'),
            settingsVibration: document.getElementById('settingsVibration'),
            settingsAccessibility: document.getElementById('settingsAccessibility'),
            settingsPrivacy: document.getElementById('settingsPrivacy'),
            settingsSave: document.getElementById('settingsSave'),
            settingsReset: document.getElementById('settingsReset'),
            settingsEmpty: document.getElementById('settingsEmpty'),
            settingsLoading: document.getElementById('settingsLoading'),
            settingsError: document.getElementById('settingsError')
        };
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
    }

    setupEventListeners() {
        // Обработка сохранения
        this.elements.settingsForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveSettings();
        });

        // Обработка сброса
        this.elements.settingsReset?.addEventListener('click', () => {
            this.resetSettings();
        });

        // Обработка изменений
        this.elements.settingsTheme?.addEventListener('change', () => {
            this.handleThemeChange();
        });

        this.elements.settingsLanguage?.addEventListener('change', () => {
            this.handleLanguageChange();
        });

        this.elements.settingsNotifications?.addEventListener('change', () => {
            this.handleNotificationsChange();
        });

        this.elements.settingsSounds?.addEventListener('change', () => {
            this.handleSoundsChange();
        });

        this.elements.settingsVibration?.addEventListener('change', () => {
            this.handleVibrationChange();
        });

        this.elements.settingsAccessibility?.addEventListener('change', () => {
            this.handleAccessibilityChange();
        });

        this.elements.settingsPrivacy?.addEventListener('change', () => {
            this.handlePrivacyChange();
        });
    }

    async loadSettings() {
        try {
            this.showLoading();
            const data = await this.settingsService.getSettings();
            this.renderSettings(data);
            this.hideLoading();
            return true;
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError();
            return false;
        }
    }

    async saveSettings() {
        try {
            const settings = this.getSettings();
            const sanitizedSettings = this.securityService.sanitizeData(settings);
            await this.settingsService.saveSettings(sanitizedSettings);
            TelegramUtils.showAlert('Настройки сохранены');
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            TelegramUtils.showAlert('Ошибка при сохранении настроек');
            return false;
        }
    }

    async resetSettings() {
        try {
            const confirmed = await TelegramUtils.showConfirm('Вы уверены, что хотите сбросить настройки?');
            if (confirmed) {
                await this.settingsService.resetSettings();
                await this.loadSettings();
                TelegramUtils.showAlert('Настройки сброшены');
            }
        } catch (error) {
            console.error('Error resetting settings:', error);
            TelegramUtils.showAlert('Ошибка при сбросе настроек');
        }
    }

    handleThemeChange() {
        const theme = this.elements.settingsTheme?.value;
        if (theme) {
            this.settingsService.setTheme(theme);
        }
    }

    handleLanguageChange() {
        const language = this.elements.settingsLanguage?.value;
        if (language) {
            this.settingsService.setLanguage(language);
        }
    }

    handleNotificationsChange() {
        const enabled = this.elements.settingsNotifications?.checked;
        this.settingsService.setNotifications(enabled);
    }

    handleSoundsChange() {
        const enabled = this.elements.settingsSounds?.checked;
        this.settingsService.setSounds(enabled);
    }

    handleVibrationChange() {
        const enabled = this.elements.settingsVibration?.checked;
        this.settingsService.setVibration(enabled);
    }

    handleAccessibilityChange() {
        const enabled = this.elements.settingsAccessibility?.checked;
        this.settingsService.setAccessibility(enabled);
    }

    handlePrivacyChange() {
        const enabled = this.elements.settingsPrivacy?.checked;
        this.settingsService.setPrivacy(enabled);
    }

    renderSettings(data) {
        if (!this.elements.settingsForm) return;

        if (!data) {
            this.showEmpty();
            return;
        }

        // Устанавливаем значения
        this.elements.settingsTheme.value = data.theme;
        this.elements.settingsLanguage.value = data.language;
        this.elements.settingsNotifications.checked = data.notifications;
        this.elements.settingsSounds.checked = data.sounds;
        this.elements.settingsVibration.checked = data.vibration;
        this.elements.settingsAccessibility.checked = data.accessibility;
        this.elements.settingsPrivacy.checked = data.privacy;
    }

    getSettings() {
        return {
            theme: this.elements.settingsTheme?.value,
            language: this.elements.settingsLanguage?.value,
            notifications: this.elements.settingsNotifications?.checked,
            sounds: this.elements.settingsSounds?.checked,
            vibration: this.elements.settingsVibration?.checked,
            accessibility: this.elements.settingsAccessibility?.checked,
            privacy: this.elements.settingsPrivacy?.checked
        };
    }

    // Методы для работы с состоянием
    showLoading() {
        this.elements.settingsLoading?.classList.remove('hidden');
        this.elements.settingsForm?.classList.add('hidden');
        this.elements.settingsEmpty?.classList.add('hidden');
        this.elements.settingsError?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.settingsLoading?.classList.add('hidden');
        this.elements.settingsForm?.classList.remove('hidden');
    }

    showEmpty() {
        this.elements.settingsEmpty?.classList.remove('hidden');
        this.elements.settingsForm?.classList.add('hidden');
        this.elements.settingsLoading?.classList.add('hidden');
        this.elements.settingsError?.classList.add('hidden');
    }

    showError() {
        this.elements.settingsError?.classList.remove('hidden');
        this.elements.settingsForm?.classList.add('hidden');
        this.elements.settingsLoading?.classList.add('hidden');
        this.elements.settingsEmpty?.classList.add('hidden');
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.settingsContainer) return;

        this.elements.settingsContainer.setAttribute('aria-hidden', !accessible);
        this.elements.settingsForm?.setAttribute('aria-disabled', !accessible);
        this.elements.settingsSave?.setAttribute('aria-disabled', !accessible);
        this.elements.settingsReset?.setAttribute('aria-disabled', !accessible);
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.settingsForm?.removeEventListener('submit', this.saveSettings);
        this.elements.settingsReset?.removeEventListener('click', this.resetSettings);
        this.elements.settingsTheme?.removeEventListener('change', this.handleThemeChange);
        this.elements.settingsLanguage?.removeEventListener('change', this.handleLanguageChange);
        this.elements.settingsNotifications?.removeEventListener('change', this.handleNotificationsChange);
        this.elements.settingsSounds?.removeEventListener('change', this.handleSoundsChange);
        this.elements.settingsVibration?.removeEventListener('change', this.handleVibrationChange);
        this.elements.settingsAccessibility?.removeEventListener('change', this.handleAccessibilityChange);
        this.elements.settingsPrivacy?.removeEventListener('change', this.handlePrivacyChange);
    }
} 