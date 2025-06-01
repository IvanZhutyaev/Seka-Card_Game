// Таймауты для ходов (в миллисекундах)
export const MOVE_TIMEOUT = 30000; // 30 секунд

// Лимиты ставок
export const MIN_BET = 10;
export const MAX_BET = 1000;

// Настройки переподключения
export const RECONNECT_ATTEMPTS = 3;
export const RECONNECT_INTERVAL = 2000; // 2 секунды
export const HEARTBEAT_INTERVAL = 10000; // 10 секунд

// Параметры матчмейкинга
export const MATCHMAKING_TIMEOUT = 60000; // 60 секунд
export const BET_FILTERS = [10, 50, 100, 500, 1000]; 