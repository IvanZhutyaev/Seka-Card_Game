// Определяем класс TelegramUtils в глобальной области видимости
window.TelegramUtils = class TelegramUtils {
    static showLoading() {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showProgress();
        }
    }

    static hideLoading() {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.hideProgress();
        }
    }

    static showAlert(message) {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    static async openLink(page, params = {}) {
        try {
            if (!window.Telegram?.WebApp) {
                throw new Error('WebApp не инициализирован');
            }

            // Формируем URL с параметрами
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');

            const url = queryString ? `/${page}?${queryString}` : `/${page}`;

            // Для внутренней навигации используем window.location.href
            window.location.href = url;
        } catch (error) {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert('Ошибка при переходе на страницу');
            }
        }
    }

    static async validateSession() {
        try {
            const response = await fetch('/api/validate-init-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Telegram-Web-App-Init-Data': window.Telegram.WebApp.initData
                }
            });

            if (!response.ok) {
                throw new Error('Invalid session');
            }

            return true;
        } catch (error) {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert('Ошибка валидации сессии');
            }
            return false;
        }
    }

    static async getBalance() {
        try {
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (!user?.id) {
                throw new Error('User ID not found');
            }

            const response = await fetch(`/api/wallet/balance?telegram_id=${user.id}`, {
                headers: {
                    'Telegram-Web-App-Init-Data': window.Telegram.WebApp.initData
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get balance');
            }

            const data = await response.json();
            return data.balance;
        } catch (error) {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert('Ошибка при получении баланса');
            }
            throw error;
        }
    }

    static hapticFeedback(style) {
        if (window.Telegram?.WebApp?.HapticFeedback) {
            switch (style) {
                case 'light':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
                    break;
                case 'rigid':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('rigid');
                    break;
                case 'soft':
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('soft');
                    break;
                default:
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        }
    }
}

// Проверяем, что класс успешно добавлен в глобальную область видимости
console.log('TelegramUtils loaded:', !!window.TelegramUtils); 