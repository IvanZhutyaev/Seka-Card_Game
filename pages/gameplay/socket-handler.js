class SocketHandler {
    constructor() {
        this.socket = null;
        this.messageHandler = null;
    }

    init(playerId, messageHandler) {
        if (!playerId) {
            console.warn("Player ID not provided - running in demo mode");
            return;
        }

        this.messageHandler = messageHandler;
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        this.socket = new WebSocket(`${protocol}${window.location.host}/ws/${playerId}`);

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.socket.onopen = () => {
            console.log("WebSocket connected");
            this.send('player_connected');
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.messageHandler?.(message);
            } catch (e) {
                console.error("Error parsing message:", e);
            }
        };

        this.socket.onclose = () => {
            console.log("WebSocket disconnected");
            this.messageHandler?.({ type: 'error', text: 'Соединение потеряно' });
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.messageHandler?.({ type: 'error', text: 'Ошибка соединения' });
        };
    }

    send(action, data = {}) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action, ...data }));
        } else {
            console.warn("WebSocket not ready");
        }
    }
}