import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private readonly SERVER_URL = 'http://localhost:3001';

  connect(): void {
    if (!this.socket) {
      this.socket = io(this.SERVER_URL);
    }

    this.socket.on('connect', () => {
      console.log('Connected to server with id:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Generic event emitter
  emit(eventName: string, data: any): void {
    if (this.socket) {
      this.socket.emit(eventName, data);
    } else {
      console.error('Socket not connected. Cannot emit event.');
    }
  }

  // Generic event listener
  on(eventName: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(eventName, callback);
    } else {
      console.error('Socket not connected. Cannot listen to event.');
    }
  }

  // Specific game actions
  createGame(): void {
    this.emit('createGame', {});
  }

  joinGame(gameId: string, userInfo: { username: string }): void {
    this.emit('joinGame', { gameId, userInfo });
  }
  
  startGame(gameId: string): void {
    this.emit('startGame', { gameId });
  }

  placeBet(gameId: string, amount: number): void {
    this.emit('placeBet', { gameId, amount });
  }

  fold(gameId: string): void {
    this.emit('fold', { gameId });
  }

  cancelWaiting(gameId: string): void {
    this.emit('cancelWaiting', { gameId });
  }
}

export const socketService = new SocketService(); 