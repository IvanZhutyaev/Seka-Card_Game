class SocketHandler {
    constructor() {
        this.socket = null;
        this.messageHandler = null;
    }

    init(userId, messageHandler) {
        if (!userId) return;

        this.messageHandler = messageHandler;
        this.socket = new WebSocket(`ws://${window.location.host}/ws/${userId}`);

        this.socket.onopen = () => {
            this.send('join', { player_id: userId });
        };

        this.socket.onmessage = (event) => {
            if (this.messageHandler) {
                this.messageHandler(JSON.parse(event.data));
            }
        };

        this.socket.onclose = () => {
            console.log('WebSocket соединение закрыто');
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket ошибка:', error);
        };
    }

    send(action, data = {}) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action, ...data }));
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
    }
}