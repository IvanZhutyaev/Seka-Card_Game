// Функция для работы с localStorage с поддержкой TTL
class Storage {
    static set(key, value, ttl = 3600) {
        const item = {
            value: value,
            timestamp: Date.now(),
            ttl: ttl * 1000 // конвертируем в миллисекунды
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    static get(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > parsed.ttl) {
            localStorage.removeItem(key);
            return null;
        }

        return parsed.value;
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static clear() {
        localStorage.clear();
    }
}

// Функция для работы с сессией
class Session {
    static KEY = 'game_session';
    static TTL = 3600; // 1 час

    static save(data) {
        Storage.set(this.KEY, data, this.TTL);
    }

    static get() {
        return Storage.get(this.KEY);
    }

    static clear() {
        Storage.remove(this.KEY);
    }

    static update(data) {
        const current = this.get() || {};
        this.save({ ...current, ...data });
    }
}

// Функция для работы с состоянием игры
class GameState {
    static KEY = 'game_state';
    static TTL = 3600; // 1 час

    static save(state) {
        Storage.set(this.KEY, state, this.TTL);
    }

    static get() {
        return Storage.get(this.KEY);
    }

    static clear() {
        Storage.remove(this.KEY);
    }

    static update(state) {
        const current = this.get() || {};
        this.save({ ...current, ...state });
    }
}

// Функция для работы с API
class API {
    static async request(endpoint, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'  // Добавляем поддержку credentials
            };

            if (window.Telegram?.WebApp?.initData) {
                defaultOptions.headers['Telegram-Web-App-Init-Data'] = window.Telegram.WebApp.initData;
            }

            // Используем правильный порт сервера
            const baseUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
            const url = new URL(endpoint, baseUrl);

            const response = await fetch(url.toString(), {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    static async get(endpoint, params = {}) {
        const url = new URL(endpoint, `${window.location.protocol}//${window.location.hostname}:3000`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        return this.request(url.toString(), { method: 'GET' });
    }

    static async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// Функция для работы с WebSocket
class GameSocket {
    constructor(gameId) {
        this.gameId = gameId;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.handlers = new Map();
    }

    connect() {
        try {
            // Создаем WebSocket URL без параметров
            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/${this.gameId}`;
            
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.emit('connected');
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('WebSocket closed');
                this.emit('disconnected');
                this.reconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.reconnect();
        }
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit('reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        setTimeout(() => {
            console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }

    emit(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => handler(data));
        }
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
    }

    handleMessage(data) {
        if (data.type) {
            this.emit(data.type, data.payload);
        }
    }
} 