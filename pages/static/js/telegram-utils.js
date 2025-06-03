/**
 * Утилиты для работы с Telegram WebApp
 */

// Немедленно создаем и экспортируем TelegramUtils
(function(root) {
    'use strict';

    // Создаем объект TelegramUtils
    var TelegramUtils = {
        // Состояние попапа
        isPopupOpen: false,
        messageQueue: [],
        isProcessingQueue: false,

        // Обработка очереди сообщений
        processMessageQueue: function() {
            if (this.isProcessingQueue || this.messageQueue.length === 0) {
                return;
            }

            this.isProcessingQueue = true;
            const nextMessage = this.messageQueue[0];
            
            const webApp = window.Telegram?.WebApp;
            if (!webApp) {
                console.error('Telegram WebApp is not available');
                this.messageQueue.shift();
                this.isProcessingQueue = false;
                this.processMessageQueue();
                return;
            }

            const callback = () => {
                this.isPopupOpen = false;
                this.messageQueue.shift();
                this.isProcessingQueue = false;
                setTimeout(() => this.processMessageQueue(), 100);
            };

            this.isPopupOpen = true;
            if (nextMessage.isError) {
                webApp.showAlert(nextMessage.message, callback);
            } else {
                webApp.showPopup({
                    message: nextMessage.message
                }, callback);
            }
        },

        // Показать сообщение пользователю
        showMessage: function(message, isError = false) {
            this.messageQueue.push({ message, isError });
            if (!this.isProcessingQueue) {
                this.processMessageQueue();
            }
        },

        // Валидация данных WebApp
        validateWebApp: async function() {
            if (!window.Telegram?.WebApp?.initData) {
                throw new Error('No Telegram WebApp init data available');
            }

            try {
                const response = await fetch('/api/validate-init-data', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Telegram-Web-App-Init-Data': window.Telegram.WebApp.initData
                    }
                });

                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    throw new Error('Invalid response type from server');
                }

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Server validation failed');
                }

                return data;
            } catch (error) {
                console.error('Validation error:', error);
                throw error;
            }
        },

        // Инициализация WebApp
        initializeWebApp: async function() {
            try {
                if (!window.Telegram?.WebApp) {
                    throw new Error('Telegram WebApp is not available');
                }

                const webApp = window.Telegram.WebApp;
                webApp.ready();

                // Валидируем данные
                const validationResult = await this.validateWebApp();
                if (!validationResult.valid) {
                    throw new Error(validationResult.error || 'Validation failed');
                }

                // Настраиваем внешний вид
                webApp.setHeaderColor('secondary_bg_color');
                webApp.expand();

                // Настраиваем главную кнопку
                if (webApp.MainButton) {
                    webApp.MainButton.setParams({
                        text: 'Начать игру',
                        is_visible: true
                    });

                    webApp.MainButton.onClick(() => {
                        document.dispatchEvent(new CustomEvent('startGame'));
                    });
                }

                return validationResult;
            } catch (error) {
                console.error('Initialization error:', error);
                this.showMessage('Ошибка инициализации: ' + error.message, true);
                throw error;
            }
        },

        async openLink(page, params = {}) {
            try {
                // Показываем индикатор загрузки
                this.showLoading();

                // Проверяем валидность сессии
                const isValid = await this.validateSession();
                if (!isValid) {
                    throw new Error('Invalid session');
                }

                // Формируем URL с параметрами
                const url = new URL(`/${page}`, window.location.origin);
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
        },

        showLoading() {
            const loadingEl = document.getElementById('loading-overlay');
            if (!loadingEl) {
                const overlay = document.createElement('div');
                overlay.id = 'loading-overlay';
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                overlay.style.zIndex = '9999';
                
                const loader = document.createElement('div');
                loader.className = 'loader';
                loader.style.border = '4px solid #f3f3f3';
                loader.style.borderTop = '4px solid #3498db';
                loader.style.borderRadius = '50%';
                loader.style.width = '40px';
                loader.style.height = '40px';
                loader.style.animation = 'spin 1s linear infinite';
                
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                
                document.head.appendChild(style);
                overlay.appendChild(loader);
                document.body.appendChild(overlay);
            }
            document.getElementById('loading-overlay').style.display = 'flex';
        },

        hideLoading() {
            const loadingEl = document.getElementById('loading-overlay');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        },

        showAlert(message) {
            if (window.Telegram?.WebApp?.showAlert) {
                window.Telegram.WebApp.showAlert(message);
            } else {
                alert(message);
            }
        },

        showConfirm(message) {
            return new Promise((resolve) => {
                if (window.Telegram?.WebApp?.showConfirm) {
                    window.Telegram.WebApp.showConfirm(message, resolve);
                } else {
                    resolve(confirm(message));
                }
            });
        },

        hapticFeedback(style) {
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
            }
        },

        getUser() {
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
        },

        notificationOccurred(type = 'success') {
            try {
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    if (window.Telegram.WebApp.isInitialized) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
                    }
                }
            } catch (error) {
                console.error('Error in notificationOccurred:', error);
            }
        },

        selectionChanged() {
            try {
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    if (window.Telegram.WebApp.isInitialized) {
                        window.Telegram.WebApp.HapticFeedback.selectionChanged();
                    }
                }
            } catch (error) {
                console.error('Error in selectionChanged:', error);
            }
        },

        closeWebApp() {
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
        },

        sendDataToServer: function(data, endpoint) {
            const initData = window.Telegram?.WebApp?.initData;
            if (!initData) {
                throw new Error('No Telegram WebApp init data available');
            }
            return fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Telegram-Web-App-Init-Data': initData // только строка!
                },
                body: JSON.stringify(data)
            });
        },
    };

    // Экспортируем в глобальную область видимости
    if (typeof root.TelegramUtils === 'undefined') {
        root.TelegramUtils = TelegramUtils;
        console.log('[TelegramUtils] Successfully initialized');
    }

    // Проверяем успешность экспорта
    if (!root.TelegramUtils) {
        console.error('[TelegramUtils] Failed to expose globally');
        // Пытаемся использовать window напрямую
        if (typeof window !== 'undefined') {
            window.TelegramUtils = TelegramUtils;
            console.log('[TelegramUtils] Exposed via window object');
        }
    }

    // Экспортируем как модуль если поддерживается
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TelegramUtils;
        console.log('[TelegramUtils] Exposed as module');
    }

    // Добавляем метод для проверки инициализации
    TelegramUtils.isInitialized = function() {
        return true;
    };

})(typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this);

// Проверяем доступность после инициализации
console.log('[TelegramUtils] Initialization check:', {
    'window.TelegramUtils exists': typeof window !== 'undefined' && !!window.TelegramUtils,
    'global.TelegramUtils exists': typeof global !== 'undefined' && !!global.TelegramUtils,
    'self.TelegramUtils exists': typeof self !== 'undefined' && !!self.TelegramUtils
});