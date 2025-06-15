// Инициализация Telegram WebApp
document.addEventListener('DOMContentLoaded', function() {
    // Убедимся, что telegram.WebApp доступен
    if (!window.Telegram || !window.Telegram.WebApp) {
        console.error('Telegram WebApp is not available');
        return;
    }

    const webApp = window.Telegram.WebApp;

    // Инициализация WebApp
    webApp.ready();

    // Включаем главную кнопку, если она есть
    if (webApp.MainButton) {
        webApp.MainButton.setParams({
            text: 'Начать игру',
            is_visible: true
        });
    }

    // Устанавливаем тему
    webApp.setHeaderColor('secondary_bg_color');

    // Расширяем WebApp на весь экран
    webApp.expand();

    // Добавляем обработчик для главной кнопки
    webApp.MainButton.onClick(function() {
        // Здесь будет логика начала игры
        console.log('Main button clicked');
        // Отправляем событие в основной код
        document.dispatchEvent(new CustomEvent('startGame'));
    });

    // Экспортируем webApp для использования в других скриптах
    window.tgWebApp = webApp;
}); 