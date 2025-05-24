import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

export class NavigationService {
    constructor() {
        this.currentPage = null;
        this.history = [];
        this.maxHistoryLength = 50;
    }

    openPage(page) {
        if (!CONFIG.ALLOWED_PAGES.includes(page)) {
            console.error('Invalid page requested:', page);
            return false;
        }

        try {
            TelegramUtils.openLink(page);
            this.currentPage = page;
            this.addToHistory(page);
            this.closeDropdown();
            return true;
        } catch (error) {
            console.error('Error opening page:', error);
            return false;
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('dropdownMenu');
        const menuButton = document.querySelector('.menu-button');
        
        if (dropdown && menuButton) {
            dropdown.classList.remove('show');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    }

    handleClickOutside = Utils.debounce((event) => {
        if (!event.target.matches('.menu-button') && !event.target.matches('.menu-line')) {
            const dropdowns = document.getElementsByClassName("dropdown-menu");
            for (const dropdown of dropdowns) {
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                    document.querySelector('.menu-button')?.setAttribute('aria-expanded', 'false');
                }
            }
        }
    }, CONFIG.DEBOUNCE_DELAY);

    addToHistory(page) {
        this.history.unshift(page);
        if (this.history.length > this.maxHistoryLength) {
            this.history.pop();
        }
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
    }

    goBack() {
        if (this.history.length > 1) {
            this.history.shift(); // Удаляем текущую страницу
            const previousPage = this.history[0];
            if (previousPage) {
                return this.openPage(previousPage);
            }
        }
        return false;
    }

    // Методы для работы с состоянием навигации
    setState(state) {
        try {
            const stateString = JSON.stringify(state);
            window.history.replaceState(state, '', window.location.href);
            return true;
        } catch (error) {
            console.error('Error setting navigation state:', error);
            return false;
        }
    }

    getState() {
        try {
            return window.history.state || {};
        } catch (error) {
            console.error('Error getting navigation state:', error);
            return {};
        }
    }

    // Методы для работы с URL
    updateUrl(params) {
        try {
            const url = new URL(window.location.href);
            Object.entries(params).forEach(([key, value]) => {
                if (value === null || value === undefined) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, value);
                }
            });
            window.history.replaceState({}, '', url);
            return true;
        } catch (error) {
            console.error('Error updating URL:', error);
            return false;
        }
    }

    getUrlParams() {
        try {
            const url = new URL(window.location.href);
            const params = {};
            url.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return params;
        } catch (error) {
            console.error('Error getting URL params:', error);
            return {};
        }
    }

    // Методы для работы с навигационными событиями
    setupNavigationEvents() {
        window.addEventListener('popstate', (event) => {
            const state = event.state || {};
            this.handleNavigationState(state);
        });

        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });
    }

    handleNavigationState(state) {
        // Обработка состояния навигации
        if (state.page) {
            this.currentPage = state.page;
        }
    }

    hasUnsavedChanges() {
        // Проверка наличия несохраненных изменений
        return false; // Реализовать при необходимости
    }
} 