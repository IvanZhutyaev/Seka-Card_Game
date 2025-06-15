// Функции для навигации между страницами
class Navigation {
    static async navigateToGame() {
        try {
            TelegramUtils.showLoading();
            
            // Проверяем валидность сессии
            const isValid = await TelegramUtils.validateSession();
            if (!isValid) {
                throw new Error('Invalid session');
            }

            // Проверяем статус игры
            const gameStatus = await API.get('/api/game/status');
            
            if (gameStatus.active) {
                // Если есть активная игра, переходим к ней
                window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/pages/gameplay/index.html?resume=true`;
            } else if (gameStatus.waiting) {
                // Если игрок уже в очереди, переходим на страницу игры
                window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/pages/gameplay/index.html`;
            } else {
                // Иначе начинаем новую игру
                window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/pages/gameplay/index.html`;
            }
        } catch (error) {
            console.error('Navigation error:', error);
            TelegramUtils.showAlert('Ошибка при переходе к игре: ' + error.message);
        } finally {
            TelegramUtils.hideLoading();
        }
    }

    static async navigateToProfile() {
        try {
            TelegramUtils.showLoading();
            window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/pages/profile/index.html`;
        } catch (error) {
            console.error('Navigation error:', error);
            TelegramUtils.showAlert('Ошибка при переходе к профилю');
        } finally {
            TelegramUtils.hideLoading();
        }
    }

    static async navigateToMainMenu() {
        try {
            TelegramUtils.showLoading();
            window.location.href = `${window.location.protocol}//${window.location.hostname}:3000/pages/main_menu.html`;
        } catch (error) {
            console.error('Navigation error:', error);
            TelegramUtils.showAlert('Ошибка при переходе в главное меню');
        } finally {
            TelegramUtils.hideLoading();
        }
    }
} 