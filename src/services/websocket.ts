import {
  RECONNECT_ATTEMPTS,
  RECONNECT_INTERVAL,
  HEARTBEAT_INTERVAL,
} from '../config/gameConfig';

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'reconnecting' | 'error';

export interface WebSocketOptions {
  url: string;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnect?: (attempt: number) => void;
  onHeartbeatTimeout?: () => void;
}

export class ReliableWebSocket {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private messageQueue: string[] = [];
  private status: WebSocketStatus = 'closed';
  private heartbeatTimer: any = null;
  private lastPong: number = Date.now();

  constructor(options: WebSocketOptions) {
    this.options = options;
    this.connect();
  }

  private connect() {
    this.status = this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
    this.ws = new WebSocket(this.options.url);
    this.ws.onopen = this.handleOpen;
    this.ws.onclose = this.handleClose;
    this.ws.onerror = this.handleError;
    this.ws.onmessage = this.handleMessage;
  }

  private handleOpen = () => {
    this.status = 'open';
    this.reconnectAttempts = 0;
    this.flushQueue();
    this.startHeartbeat();
    this.options.onOpen?.();
  };

  private handleClose = (event: CloseEvent) => {
    this.status = 'closed';
    this.stopHeartbeat();
    this.options.onClose?.(event);
    this.tryReconnect();
  };

  private handleError = (event: Event) => {
    this.status = 'error';
    this.options.onError?.(event);
  };

  private handleMessage = (event: MessageEvent) => {
    if (event.data === 'pong') {
      this.lastPong = Date.now();
    } else {
      this.options.onMessage?.(event);
    }
  };

  private tryReconnect() {
    if (this.reconnectAttempts < RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      this.options.onReconnect?.(this.reconnectAttempts);
      setTimeout(() => this.connect(), RECONNECT_INTERVAL);
    }
  }

  send(data: string) {
    if (this.status === 'open' && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(this.messageQueue.shift()!);
    }
  }

  close() {
    this.stopHeartbeat();
    this.ws?.close();
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  // Heartbeat
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        setTimeout(() => {
          if (Date.now() - this.lastPong > HEARTBEAT_INTERVAL) {
            this.options.onHeartbeatTimeout?.();
            this.ws?.close();
          }
        }, HEARTBEAT_INTERVAL / 2);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
} 