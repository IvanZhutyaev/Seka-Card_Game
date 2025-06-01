// Типы для Telegram WebApp
export interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

// Статусы игры
export type GameStatus = 
    | 'waiting'      // Ожидание начала игры
    | 'matchmaking'  // Поиск игроков
    | 'betting'      // Фаза ставок
    | 'playing'      // Игра идет
    | 'finished'     // Игра завершена
    | 'error'        // Ошибка
    | 'reconnecting' // Переподключение

// Интерфейс для лобби
export interface Lobby {
    id: string;
    name: string;
    type: 'public' | 'private';
    playersCount: number;
    requiredPlayers: number;
    minBet: number;
    maxBet: number;
    createdBy: string;
    createdAt: number;
}

// Состояние матчмейкинга
export interface MatchmakingState {
    playersCount: number;        // Текущее количество игроков
    requiredPlayers: number;     // Необходимое количество игроков
    minBet: number;             // Минимальная ставка
    maxBet: number;             // Максимальная ставка
    waitingPlayers: string[];   // Список ожидающих игроков
    isSearching: boolean;       // Флаг поиска игры
    lobbyId?: string;          // ID лобби
    lobbyName?: string;        // Название лобби
    lobbyType?: 'public' | 'private'; // Тип лобби
    availableLobbies?: Lobby[];  // Добавляем список доступных лобби
}

// Карта
export interface Card {
    suit: '♠' | '♥' | '♦' | '♣';
    rank: string;
    value: number;
    hidden?: boolean;          // Флаг скрытой карты
}

// Игрок
export interface Player {
    id: string;                 // ID игрока
    cards: Card[];             // Карты игрока
    bet: number;               // Текущая ставка
    total_bet: number;         // Общая сумма ставок
    balance: number;           // Баланс игрока
    status: 'waiting' | 'ready' | 'playing' | 'folded';  // Статус игрока
    user_info?: TelegramWebAppUser;  // Информация о пользователе Telegram
    lastAction?: string;       // Последнее действие
    lastActionTime?: number;   // Время последнего действия
    position?: number;         // Позиция за столом
    isDealer?: boolean;        // Является ли дилером
    isSmallBlind?: boolean;    // Маленький блайнд
    isBigBlind?: boolean;      // Большой блайнд
}

// Состояние игры
export interface GameState {
    status: GameStatus;        // Текущий статус игры
    bank: number;             // Банк игры
    current_turn: string | null;  // ID игрока, чей сейчас ход
    players: Record<string, Player>;  // Список игроков
    matchmaking: MatchmakingState;    // Состояние матчмейкинга
    round?: string;           // Текущий раунд
    minBet?: number;          // Минимальная ставка
    maxBet?: number;          // Максимальная ставка
    error?: string;           // Сообщение об ошибке
    reconnectAttempts: number;  // Количество попыток переподключения
    lastActionTime: number;    // Время последнего действия
    gameId?: string;          // ID игры
    tableId?: string;         // ID стола
    dealerPosition?: number;  // Позиция дилера
    currentRound?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'; // Текущий раунд
    communityCards?: Card[];  // Общие карты на столе
    pot?: number;            // Текущий банк
    sidePots?: {            // Дополнительные банки
        amount: number;
        eligiblePlayers: string[];
    }[];
}

// Игровое действие
export interface GameAction {
    type: 'game_action';
    action: 'bet' | 'fold' | 'check' | 'call' | 'raise' | 'all-in';
    amount?: number;
    timestamp: number;
    playerId?: string;
}

// WebSocket сообщение
export interface WebSocketMessage {
    type: string;
    data?: any;
    timestamp: number;
    error?: string;
    status?: string;
}

// Экспортируем тип TelegramUser для удобства
export type { TelegramWebAppUser as TelegramUser }; 