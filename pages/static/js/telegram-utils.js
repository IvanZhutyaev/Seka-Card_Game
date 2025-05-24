/**
 * Утилиты для работы с Telegram WebApp
 */

class TelegramUtils {
    static init() {
        if (!window.Telegram?.WebApp) {
            console.error('Telegram WebApp не доступен');
            return false;
        }

        try {
            // Расширяем WebApp на весь экран
            Telegram.WebApp.expand();
            
            // Включаем подтверждение закрытия
            Telegram.WebApp.enableClosingConfirmation();
            
            // Проверяем подпись initData
            if (!this.validateInitData()) {
                console.error('Неверная подпись initData');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка инициализации Telegram WebApp:', error);
            return false;
        }
    }

    static validateInitData() {
        try {
            const initData = Telegram.WebApp.initData;
            const initDataUnsafe = Telegram.WebApp.initDataUnsafe;
            
            if (!initData || !initDataUnsafe) {
                console.error('initData не найден');
                return false;
            }

            // Проверяем наличие необходимых данных
            if (!initDataUnsafe.user || !initDataUnsafe.auth_date) {
                console.error('Отсутствуют необходимые данные в initData');
                return false;
            }

            // Проверяем время жизни initData (24 часа)
            const authDate = new Date(initDataUnsafe.auth_date * 1000);
            const now = new Date();
            if (now - authDate > 24 * 60 * 60 * 1000) {
                console.error('initData устарел');
                return false;
            }

            // Отправляем initData на сервер для проверки подписи
            return this.validateInitDataOnServer(initData);
        } catch (error) {
            console.error('Ошибка проверки initData:', error);
            return false;
        }
    }

    static async validateInitDataOnServer(initData) {
        try {
            const response = await fetch('/api/validate-init-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData }),
            });

            if (!response.ok) {
                console.error('Ошибка валидации initData на сервере');
                return false;
            }

            const result = await response.json();
            return result.valid;
        } catch (error) {
            console.error('Ошибка отправки initData на сервер:', error);
            return false;
        }
    }

    static getUser() {
        try {
            const user = Telegram.WebApp.initDataUnsafe.user;
            if (!user) {
                console.error('Данные пользователя не найдены');
                return null;
            }
            return user;
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
            return null;
        }
    }

    static async closeWebApp() {
        try {
            if (window.Telegram?.WebApp) {
                // Пытаемся закрыть стандартным методом
                Telegram.WebApp.close();
                
                // Если через 0.3 сек WebApp еще открыт — редиректим в бота
                setTimeout(() => {
                    window.location.href = "tg://";
                }, 300);
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Ошибка закрытия WebApp:', error);
            window.close();
        }
    }

    static async openLink(url) {
        try {
            if (window.Telegram?.WebApp?.openLink) {
                Telegram.WebApp.openLink(url);
            } else {
                window.location.href = url;
            }
        } catch (error) {
            console.error('Ошибка открытия ссылки:', error);
            window.location.href = url;
        }
    }

    static showAlert(message) {
        try {
            if (window.Telegram?.WebApp?.showAlert) {
                Telegram.WebApp.showAlert(message);
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Ошибка показа уведомления:', error);
            alert(message);
        }
    }

    static showConfirm(message, callback) {
        try {
            if (window.Telegram?.WebApp?.showConfirm) {
                Telegram.WebApp.showConfirm(message, callback);
            } else {
                callback(confirm(message));
            }
        } catch (error) {
            console.error('Ошибка показа подтверждения:', error);
            callback(confirm(message));
        }
    }

    static showPopup(params) {
        try {
            if (window.Telegram?.WebApp?.showPopup) {
                Telegram.WebApp.showPopup(params);
            } else {
                alert(params.message);
            }
        } catch (error) {
            console.error('Ошибка показа попапа:', error);
            alert(params.message);
        }
    }

    static hapticFeedback(style = 'light') {
        try {
            if (window.Telegram?.WebApp?.HapticFeedback) {
                Telegram.WebApp.HapticFeedback.impactOccurred(style);
            }
        } catch (error) {
            console.error('Ошибка тактильной обратной связи:', error);
        }
    }
} 