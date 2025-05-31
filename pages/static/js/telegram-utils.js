/**
 * Утилиты для работы с Telegram WebApp
 */

class TelegramUtils {
    static async validateSession() {
        try {
            if (!window.Telegram?.WebApp?.initData) {
                throw new Error('No WebApp init data');
            }

            const baseUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
            const response = await fetch(`${baseUrl}/api/validate-init-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Telegram-Web-App-Init-Data': window.Telegram.WebApp.initData
                },
                credentials: 'include',
                body: JSON.stringify({ initData: window.Telegram.WebApp.initData })
            });

            if (!response.ok) {
                throw new Error('Session validation failed');
            }

            const result = await response.json();
            return result.valid;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    static async openLink(page, params = {}) {
        try {
            // Показываем индикатор загрузки
            this.showLoading();

            // Проверяем валидность сессии
            const isValid = await this.validateSession();
            if (!isValid) {
                throw new Error('Invalid session');
            }

            // Формируем URL с параметрами
            const baseUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
            const url = new URL(`/pages/${page}.html`, baseUrl);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });

            // Переходим на новую страницу
            window.location.href = url.toString();
        } catch (error) {
            console.error('Navigation error:', error);
            this.showAlert(`Ошибка навигации: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    static showLoading() {
        const loadingEl = document.getElementById('loading-overlay');
        if (!loadingEl) {
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = '<div class="loader"></div>';
            document.body.appendChild(overlay);
        }
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    static hideLoading() {
        const loadingEl = document.getElementById('loading-overlay');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    static showAlert(message) {
        if (window.Telegram?.WebApp?.showAlert) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    static showConfirm(message) {
        return new Promise((resolve) => {
            if (window.Telegram?.WebApp?.showConfirm) {
                window.Telegram.WebApp.showConfirm(message, resolve);
            } else {
                resolve(confirm(message));
            }
        });
    }

    static hapticFeedback(style) {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
    }

    static getUser() {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
                return window.Telegram.WebApp.initDataUnsafe.user;
            }
            // Возвращаем базовый объект пользователя для локальной разработки
            return {
                id: 0,
                first_name: 'Guest',
                username: 'guest',
                photo_url: null
            };
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    static notificationOccurred(type = 'success') {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                if (window.Telegram.WebApp.isInitialized) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
                }
            }
        } catch (error) {
            console.error('Error in notificationOccurred:', error);
        }
    }

    static selectionChanged() {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                if (window.Telegram.WebApp.isInitialized) {
                    window.Telegram.WebApp.HapticFeedback.selectionChanged();
                }
            }
        } catch (error) {
            console.error('Error in selectionChanged:', error);
        }
    }

    static closeWebApp() {
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing WebApp:', error);
            window.close();
        }
    }
} 