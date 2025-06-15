// Проверка загрузки TelegramUtils
function checkTelegramUtils() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const check = () => {
            console.log('[Init] Checking for TelegramUtils...', {
                attempt: attempts + 1,
                exists: !!window.TelegramUtils,
                windowKeys: Object.keys(window).length
            });

            if (window.TelegramUtils && typeof window.TelegramUtils.isInitialized === 'function') {
                console.log('[Init] TelegramUtils found and initialized');
                resolve(window.TelegramUtils);
            } else if (attempts >= maxAttempts) {
                console.error('[Init] Available window properties:', Object.keys(window));
                reject(new Error('TelegramUtils failed to load after ' + maxAttempts + ' attempts'));
            } else {
                attempts++;
                // Try to reload TelegramUtils if not found
                if (attempts % 5 === 0 && !window.TelegramUtils) {
                    console.log('[Init] Attempting to reload TelegramUtils...');
                    const script = document.createElement('script');
                    script.src = '/static/js/telegram-utils.js';
                    document.head.appendChild(script);
                }
                setTimeout(check, 200);
            }
        };
        
        // Start checking
        check();
    });
}

// Инициализация Telegram WebApp
window.addEventListener('load', async function() {
    console.log('[Init] Page loaded, starting initialization...');
    
    try {
        // Ждем загрузки TelegramUtils
        const utils = await checkTelegramUtils();
        console.log('[Init] TelegramUtils loaded successfully');

        // Проверяем наличие Telegram WebApp
        if (!window.Telegram?.WebApp) {
            throw new Error('Telegram WebApp is not available');
        }

        // Инициализируем WebApp
        const result = await utils.initializeWebApp();
        console.log('[Init] WebApp initialization successful:', result);

        // Экспортируем webApp для использования в других скриптах
        window.tgWebApp = window.Telegram.WebApp;
    } catch (error) {
        console.error('[Init] Initialization failed:', error);
        // Используем alert если TelegramUtils недоступен
        const errorMessage = 'Ошибка инициализации: ' + error.message;
        if (!window.TelegramUtils) {
            alert(errorMessage);
        } else {
            window.TelegramUtils.showMessage(errorMessage, true);
        }
    }
}); 