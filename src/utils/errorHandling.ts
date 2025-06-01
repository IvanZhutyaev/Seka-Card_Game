// Типы ошибок
export type AppErrorType =
  | 'network'
  | 'websocket'
  | 'validation'
  | 'timeout'
  | 'game_logic'
  | 'unknown';

export interface AppError {
  type: AppErrorType;
  message: string;
  code?: number | string;
  details?: any;
  timestamp: number;
}

// Логирование ошибок (можно расширить интеграцией с внешними сервисами)
export function logError(error: AppError) {
  // eslint-disable-next-line no-console
  console.error(`[${error.type}]`, error.message, error.details || '', error.timestamp);
  // Здесь можно добавить отправку ошибки в сервис аналитики
}

// Централизованный обработчик ошибок
export function handleAppError(
  type: AppErrorType,
  message: string,
  details?: any,
  code?: number | string
): AppError {
  const error: AppError = {
    type,
    message,
    code,
    details,
    timestamp: Date.now(),
  };
  logError(error);
  return error;
} 