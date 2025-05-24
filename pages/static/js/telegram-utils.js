/**
 * Утилиты для работы с Telegram WebApp
 */

const TelegramUtils = {
    webApp: null,
    isInitialized: false,
    previousPage: null,

    init() {
        try {
            // Если уже инициализировано, возвращаем true
            if (this.isInitialized) {
                return true;
            }

            // Проверяем доступность Telegram WebApp
            if (window.Telegram && window.Telegram.WebApp) {
                this.webApp = window.Telegram.WebApp;
                
                // Инициализируем WebApp
                this.webApp.ready();
                this.webApp.expand();

                // Настраиваем тему
                document.documentElement.className = this.webApp.colorScheme;

                // Включаем кнопку "назад" если это не главное меню
                const currentPath = window.location.pathname;
                if (currentPath !== '/' && currentPath !== '/main_menu') {
                    this.webApp.BackButton.show();
                } else {
                    this.webApp.BackButton.hide();
                }

                // Обработчик кнопки "назад"
                this.webApp.BackButton.onClick(() => {
                    if (this.previousPage) {
                        this.openLink(this.previousPage);
                    } else {
                        this.openLink('main_menu');
                    }
                });

                // Скрываем MainButton если она есть
                if (this.webApp.MainButton) {
                    this.webApp.MainButton.hide();
                }
                
                this.isInitialized = true;
                console.log('Telegram WebApp initialized successfully');
                return true;
            } else {
                // Если открыто не в Telegram, инициализируем базовый режим
                console.log('Running in standalone mode (not in Telegram WebApp)');
                this.isInitialized = true;
                return true;
            }
        } catch (error) {
            console.error('Error initializing Telegram WebApp:', error);
            return false;
        }
    },

    getUser() {
        try {
            if (this.webApp && this.webApp.initDataUnsafe && this.webApp.initDataUnsafe.user) {
                return this.webApp.initDataUnsafe.user;
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

    showAlert(message) {
        try {
            if (this.webApp) {
                this.webApp.showAlert(message);
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Error showing alert:', error);
            alert(message);
        }
    },

    showConfirm(message, callback) {
        try {
            if (this.webApp) {
                this.webApp.showConfirm(message, callback);
            } else {
                const result = confirm(message);
                if (callback) callback(result);
            }
        } catch (error) {
            console.error('Error showing confirm:', error);
            const result = confirm(message);
            if (callback) callback(result);
        }
    },

    hapticFeedback(style) {
        try {
            if (this.webApp && this.webApp.HapticFeedback) {
                switch (style) {
                    case 'light':
                        this.webApp.HapticFeedback.impactOccurred('light');
                        break;
                    case 'medium':
                        this.webApp.HapticFeedback.impactOccurred('medium');
                        break;
                    case 'heavy':
                        this.webApp.HapticFeedback.impactOccurred('heavy');
                        break;
                }
            }
        } catch (error) {
            console.error('Error in haptic feedback:', error);
        }
    },

    openLink(page) {
        try {
            // Сохраняем текущую страницу перед переходом
            const currentPath = window.location.pathname.substring(1) || 'main_menu';
            this.previousPage = currentPath;

            // Получаем текущий initData
            const initData = this.webApp ? this.webApp.initData : '';
            
            // Добавляем initData в заголовки для нового запроса
            const headers = new Headers();
            if (initData) {
                headers.append('X-Telegram-Init-Data', initData);
            }

            // Загружаем новую страницу с сохранением контекста WebApp
            fetch(`/${page}`, { headers })
                .then(response => response.text())
                .then(html => {
                    // Заменяем содержимое страницы
                    document.open();
                    document.write(html);
                    document.close();
                    
                    // Реинициализируем Telegram WebApp на новой странице
                    this.init();
                    
                    // Обновляем URL без перезагрузки страницы
                    window.history.pushState({}, '', `/${page}`);

                    // Управляем видимостью кнопки "назад"
                    if (this.webApp) {
                        if (page === 'main_menu') {
                            this.webApp.BackButton.hide();
                        } else {
                            this.webApp.BackButton.show();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error loading page:', error);
                    this.showAlert('Ошибка при загрузке страницы');
                });
        } catch (error) {
            console.error('Error in openLink:', error);
            // Fallback к обычной навигации
            window.location.href = `/${page}`;
        }
    },

    closeWebApp() {
        try {
            if (this.webApp) {
                this.webApp.close();
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing WebApp:', error);
            window.close();
        }
    }
}; 