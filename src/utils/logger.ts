type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class Logger {
  private static instance: Logger;
  private logQueue: LogMessage[] = [];
  private isProcessing = false;
  private userId?: string;

  private constructor() {
    // Приватный конструктор для синглтона
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setUserId(id: string) {
    this.userId = id;
  }

  private async sendLogs() {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;
    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Web-App-Init-Data': window.Telegram?.WebApp?.initData || ''
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        // Если отправка не удалась, возвращаем логи обратно в очередь
        this.logQueue = [...logs, ...this.logQueue];
      }
    } catch (error) {
      // В случае ошибки возвращаем логи обратно в очередь
      this.logQueue = [...logs, ...this.logQueue];
    } finally {
      this.isProcessing = false;
      // Если в очереди остались логи, пытаемся отправить их
      if (this.logQueue.length > 0) {
        setTimeout(() => this.sendLogs(), 1000);
      }
    }
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const logMessage: LogMessage = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userId: this.userId
    };

    this.logQueue.push(logMessage);
    this.sendLogs();
  }

  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }
}

export const logger = Logger.getInstance(); 