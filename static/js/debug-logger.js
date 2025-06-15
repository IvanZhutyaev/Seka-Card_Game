class DebugLogger {
    static container = null;
    static isEnabled = false;

    static init() {
        // Создаем контейнер для логов только в режиме разработки
        if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id === '123456789') { // Замените на ваш ID
            this.isEnabled = true;
            this.container = document.createElement('div');
            this.container.id = 'debug-logs';
            this.container.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                max-height: 30vh;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                font-family: monospace;
                font-size: 12px;
                padding: 10px;
                overflow-y: auto;
                z-index: 9999;
            `;
            document.body.appendChild(this.container);
        }
    }

    static log(...args) {
        if (!this.isEnabled) return;
        
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');

        const logEntry = document.createElement('div');
        logEntry.style.marginBottom = '5px';
        logEntry.innerHTML = `[${new Date().toISOString()}] ${message}`;
        
        this.container.appendChild(logEntry);
        this.container.scrollTop = this.container.scrollHeight;
        
        // Ограничиваем количество сообщений
        while (this.container.children.length > 50) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    static error(...args) {
        if (!this.isEnabled) return;
        
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            }
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');

        const logEntry = document.createElement('div');
        logEntry.style.cssText = 'color: #ff4444; margin-bottom: 5px;';
        logEntry.innerHTML = `[${new Date().toISOString()}] ERROR: ${message}`;
        
        this.container.appendChild(logEntry);
        this.container.scrollTop = this.container.scrollHeight;
    }

    static clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Инициализация при загрузке страницы
window.addEventListener('load', () => DebugLogger.init()); 