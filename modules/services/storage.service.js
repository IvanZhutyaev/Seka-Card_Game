import { CONFIG } from '../config.js';

export class StorageService {
    constructor() {
        this.storage = window.localStorage;
        this.cache = new Map();
    }

    set(key, value) {
        try {
            const encrypted = btoa(JSON.stringify(value));
            this.storage.setItem(key, encrypted);
            this.cache.set(key, value);
            return true;
        } catch (error) {
            console.error(`Ошибка сохранения данных (${key}):`, error);
            return false;
        }
    }

    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        try {
            const value = this.storage.getItem(key);
            if (value) {
                const decrypted = JSON.parse(atob(value));
                this.cache.set(key, decrypted);
                return decrypted;
            }
            return null;
        } catch (error) {
            console.error(`Ошибка получения данных (${key}):`, error);
            return null;
        }
    }

    remove(key) {
        try {
            this.storage.removeItem(key);
            this.cache.delete(key);
            return true;
        } catch (error) {
            console.error(`Ошибка удаления данных (${key}):`, error);
            return false;
        }
    }

    clear() {
        try {
            this.storage.clear();
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('Ошибка очистки хранилища:', error);
            return false;
        }
    }

    // Специфичные методы для работы с пользовательскими данными
    setUserData(userData) {
        return this.set(CONFIG.STORAGE_KEYS.USER_DATA, userData);
    }

    getUserData() {
        return this.get(CONFIG.STORAGE_KEYS.USER_DATA);
    }

    setSessionData(sessionData) {
        return this.set(CONFIG.STORAGE_KEYS.SESSION_DATA, sessionData);
    }

    getSessionData() {
        return this.get(CONFIG.STORAGE_KEYS.SESSION_DATA);
    }

    // Методы для работы с настройками
    setSettings(settings) {
        return this.set('settings', settings);
    }

    getSettings() {
        return this.get('settings') || {};
    }

    // Методы для работы с кэшем
    clearCache() {
        this.cache.clear();
    }

    // Методы для работы с историей
    addToHistory(item) {
        const history = this.get('history') || [];
        history.unshift(item);
        if (history.length > 50) history.pop(); // Ограничиваем историю
        return this.set('history', history);
    }

    getHistory() {
        return this.get('history') || [];
    }

    clearHistory() {
        return this.remove('history');
    }
} 