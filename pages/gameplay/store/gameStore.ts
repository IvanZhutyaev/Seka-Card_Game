import { create } from 'zustand';
import { GameState, GameAction, Player, TelegramUser, WebSocketMessage } from '../types/game';
import { MOVE_TIMEOUT } from '../../../src/config/gameConfig';

// Константы
const MAX_RECONNECT_ATTEMPTS = 5;  // Максимальное количество попыток переподключения
const RECONNECT_DELAY = 5000;      // Задержка между попытками (5 секунд)
const ACTION_COOLDOWN = 1000;      // Задержка между действиями (1 секунда)
const MESSAGE_TIMEOUT = 30000;     // Таймаут сообщений (30 секунд)

// WebSocket URL
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

// Начальное состояние игры
const initialGameState: GameState = {
    status: 'waiting',
    bank: 0,
    current_turn: null,
    players: {},
    matchmaking: {
        playersCount: 0,
        requiredPlayers: 6,
        minBet: 100,
        maxBet: 2000,
        waitingPlayers: [],
        isSearching: false,
        lobbyType: 'public'
    },
    reconnectAttempts: 0,
    lastActionTime: 0,
    connectionStatus: 'closed',
    moveTimer: null,
    moveTimeoutAt: null,
    wasDisconnected: false,
    lastError: null
};

// Интерфейс store
interface GameStore {
    gameState: GameState;
    telegramUser: TelegramUser | null;
    isConnected: boolean;
    ws: WebSocket | null;
    connect: () => void;
    disconnect: () => void;
    initTelegramUser: () => TelegramUser | null;
    makeAction: (action: GameAction) => void;
    exitGame: () => void;
    cancelMatchmaking: () => void;
    handleError: (error: string) => void;
    joinLobby: (lobbyId: string) => void;
    createLobby: (lobbyName: string, lobbyType: 'public' | 'private') => void;
    leaveLobby: () => void;
    getAvailableLobbies: () => void;
    startMoveTimer: (timeout?: number) => void;
    stopMoveTimer: () => void;
    setConnectionStatus: (status: GameState['connectionStatus']) => void;
    setLastError: (error: string) => void;
}

// Создаем store
export const useGameState = create<GameStore>((set, get) => ({
    gameState: initialGameState,
    telegramUser: null,
    isConnected: false,
    ws: null,

    // Подключение к WebSocket
    connect: () => {
        const { telegramUser, gameState } = get();
        
        // Проверяем наличие ID пользователя
        if (!telegramUser?.id) {
            console.error('Cannot connect: no user ID');
            return;
        }

        // Проверяем количество попыток переподключения
        if (gameState.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            set(state => ({
                gameState: {
                    ...state.gameState,
                    status: 'error',
                    error: 'Не удалось подключиться к серверу. Пожалуйста, обновите страницу.'
                }
            }));
            return;
        }

        console.log('Attempting to connect to WebSocket...', { 
            userId: telegramUser.id,
            attempt: gameState.reconnectAttempts + 1
        });

        // Создаем WebSocket соединение
        const wsUrl = `${WS_URL}/${telegramUser.id}`;
        const ws = new WebSocket(wsUrl);
        
        // Обработчик открытия соединения
        ws.onopen = () => {
            set({ isConnected: true, ws });
            console.log('WebSocket connected successfully');
            
            // Отправляем initData при подключении
            if (window.Telegram?.WebApp?.initData) {
                console.log('Sending initData...');
                ws.send(JSON.stringify({
                    type: 'init',
                    initData: window.Telegram.WebApp.initData,
                    timestamp: Date.now()
                }));

                // Если был в процессе поиска игры, возобновляем поиск
                if (get().gameState.matchmaking.isSearching) {
                    setTimeout(() => {
                        console.log('Resuming game search...');
                        ws.send(JSON.stringify({ 
                            type: 'find_game',
                            timestamp: Date.now()
                        }));
                    }, 1000);
                }
            } else {
                console.error('No Telegram WebApp init data available');
                ws.close();
            }
        };

        // Обработчик сообщений
        ws.onmessage = (event) => {
            try {
                console.log('Received WebSocket message:', event.data);
                const data: WebSocketMessage = JSON.parse(event.data);
                
                // Проверяем timestamp сообщения
                if (Date.now() - data.timestamp > MESSAGE_TIMEOUT) {
                    console.warn('Received outdated message');
                    return;
                }

                // Обрабатываем различные типы сообщений
                switch (data.type) {
                    case 'init_success':
                        console.log('Init successful');
                        break;

                    case 'matchmaking_update':
                        console.log('Matchmaking update:', data);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                matchmaking: {
                                    ...state.gameState.matchmaking,
                                    playersCount: data.data.players_count,
                                    requiredPlayers: data.data.required_players,
                                    minBet: data.data.min_bet,
                                    maxBet: data.data.max_bet,
                                    waitingPlayers: data.data.waiting_players || [],
                                    isSearching: true,
                                    lobbyId: data.data.lobby_id,
                                    lobbyName: data.data.lobby_name,
                                    lobbyType: data.data.lobby_type
                                }
                            }
                        }));
                        break;

                    case 'game_state':
                        console.log('Updating game state:', data.data);
                        set({ gameState: { ...data.data, reconnectAttempts: 0 } });
                        break;

                    case 'error':
                        console.error('Game error:', data.data.message);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                status: 'error',
                                error: data.data.message
                            }
                        }));
                        break;

                    case 'player_joined':
                        console.log('Player joined:', data.data.player);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                players: {
                                    ...state.gameState.players,
                                    [data.data.player.id]: data.data.player
                                }
                            }
                        }));
                        break;

                    case 'player_left':
                        console.log('Player left:', data.data.playerId);
                        set(state => {
                            const { [data.data.playerId]: _, ...remainingPlayers } = state.gameState.players;
                            return {
                                gameState: {
                                    ...state.gameState,
                                    players: remainingPlayers
                                }
                            };
                        });
                        break;

                    case 'lobby_created':
                        console.log('Lobby created:', data.data);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                matchmaking: {
                                    ...state.gameState.matchmaking,
                                    lobbyId: data.data.lobby_id,
                                    lobbyName: data.data.lobby_name,
                                    lobbyType: data.data.lobby_type,
                                    isSearching: true
                                }
                            }
                        }));
                        break;

                    case 'lobby_joined':
                        console.log('Joined lobby:', data.data);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                matchmaking: {
                                    ...state.gameState.matchmaking,
                                    lobbyId: data.data.lobby_id,
                                    lobbyName: data.data.lobby_name,
                                    lobbyType: data.data.lobby_type,
                                    isSearching: true
                                }
                            }
                        }));
                        break;

                    case 'available_lobbies':
                        console.log('Available lobbies:', data.data);
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                matchmaking: {
                                    ...state.gameState.matchmaking,
                                    availableLobbies: data.data.lobbies
                                }
                            }
                        }));
                        break;

                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                get().handleError('Ошибка обработки сообщения от сервера');
            }
        };

        // Обработчик закрытия соединения
        ws.onclose = (event) => {
            console.log('WebSocket closed:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            
            set(state => ({
                isConnected: false,
                gameState: {
                    ...state.gameState,
                    status: 'reconnecting',
                    reconnectAttempts: state.gameState.reconnectAttempts + 1
                }
            }));

            // Пробуем переподключиться
            setTimeout(() => {
                console.log('Attempting to reconnect...');
                get().connect();
            }, RECONNECT_DELAY);
        };

        // Обработчик ошибок
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            get().handleError('Ошибка соединения с сервером');
        };
    },

    // Отключение от WebSocket
    disconnect: () => {
        const { ws } = get();
        if (ws) {
            ws.close();
            set({ ws: null, isConnected: false });
        }
    },

    // Инициализация пользователя Telegram
    initTelegramUser: () => {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            set({ telegramUser: user });
            return user;
        }
        return null;
    },

    // Выполнение игрового действия
    makeAction: (action: GameAction) => {
        const { ws, isConnected, gameState, telegramUser } = get();
        
        // Проверяем cooldown
        if (Date.now() - gameState.lastActionTime < ACTION_COOLDOWN) {
            console.warn('Action cooldown');
            return;
        }

        // Валидация действия
        if (!validateAction(action)) {
            return;
        }

        if (ws && isConnected) {
            const actionWithTimestamp = {
                ...action,
                playerId: telegramUser?.id.toString(),
                timestamp: Date.now()
            };
            ws.send(JSON.stringify(actionWithTimestamp));
            set(state => ({
                gameState: {
                    ...state.gameState,
                    lastActionTime: Date.now()
                }
            }));
        } else {
            console.error('WebSocket not connected');
            get().handleError('Нет соединения с сервером');
        }
    },

    // Выход из игры
    exitGame: () => {
        const { ws } = get();
        if (ws) {
            ws.send(JSON.stringify({ 
                type: 'exit_game',
                timestamp: Date.now()
            }));
            ws.close();
        }
        set({ 
            gameState: initialGameState,
            isConnected: false,
            ws: null
        });
    },

    // Отмена поиска игры
    cancelMatchmaking: () => {
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify({ 
                type: 'cancel_matchmaking',
                timestamp: Date.now()
            }));
            set(state => ({
                gameState: {
                    ...state.gameState,
                    matchmaking: {
                        ...state.gameState.matchmaking,
                        isSearching: false
                    }
                }
            }));
        }
    },

    // Присоединение к лобби
    joinLobby: (lobbyId: string) => {
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'join_lobby',
                lobbyId,
                timestamp: Date.now()
            }));
        }
    },

    // Создание лобби
    createLobby: (lobbyName: string, lobbyType: 'public' | 'private') => {
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'create_lobby',
                lobbyName,
                lobbyType,
                timestamp: Date.now()
            }));
        }
    },

    // Выход из лобби
    leaveLobby: () => {
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'leave_lobby',
                timestamp: Date.now()
            }));
            set(state => ({
                gameState: {
                    ...state.gameState,
                    matchmaking: {
                        ...state.gameState.matchmaking,
                        isSearching: false,
                        lobbyId: undefined,
                        lobbyName: undefined
                    }
                }
            }));
        }
    },

    // Обработка ошибок
    handleError: (error: string) => {
        console.error('Game error:', error);
        set(state => ({
            gameState: {
                ...state.gameState,
                status: 'error',
                error
            }
        }));
    },

    // Добавляем новый метод в store
    getAvailableLobbies: () => {
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'get_available_lobbies',
                timestamp: Date.now()
            }));
        }
    },

    // Таймер хода
    startMoveTimer: (timeout = MOVE_TIMEOUT) => {
        const { gameState } = get();
        if (gameState.moveTimer) {
            clearTimeout(gameState.moveTimer);
        }
        const moveTimeoutAt = Date.now() + timeout;
        const timer = window.setTimeout(() => {
            // Автоматический фолд при истечении времени
            const { makeAction, gameState } = get();
            if (gameState.current_turn === get().telegramUser?.id.toString()) {
                makeAction({ type: 'game_action', action: 'fold', timestamp: Date.now() });
            }
            set(state => ({
                gameState: {
                    ...state.gameState,
                    moveTimer: null,
                    moveTimeoutAt: null
                }
            }));
        }, timeout);
        set(state => ({
            gameState: {
                ...state.gameState,
                moveTimer: timer,
                moveTimeoutAt
            }
        }));
    },
    stopMoveTimer: () => {
        const { gameState } = get();
        if (gameState.moveTimer) {
            clearTimeout(gameState.moveTimer);
        }
        set(state => ({
            gameState: {
                ...state.gameState,
                moveTimer: null,
                moveTimeoutAt: null
            }
        }));
    },
    setConnectionStatus: (status) => {
        set(state => ({
            gameState: {
                ...state.gameState,
                connectionStatus: status
            }
        }));
    },
    setLastError: (error) => {
        set(state => ({
            gameState: {
                ...state.gameState,
                lastError: error
            }
        }));
    }
}));

// Валидация действий
function validateAction(action: GameAction): boolean {
    const { gameState, telegramUser } = useGameState.getState();
    
    // Проверяем, что это ход игрока
    if (gameState.current_turn !== telegramUser?.id.toString()) {
        console.error('Not your turn');
        return false;
    }
    
    // Проверяем валидность ставки
    if (action.action === 'bet' || action.action === 'raise' || action.action === 'all-in') {
        if (!action.amount) {
            console.error('No bet amount specified');
            return false;
        }
        if (action.amount < gameState.matchmaking.minBet || 
            action.amount > gameState.matchmaking.maxBet) {
            console.error('Invalid bet amount');
            return false;
        }
    }
    
    return true;
} 