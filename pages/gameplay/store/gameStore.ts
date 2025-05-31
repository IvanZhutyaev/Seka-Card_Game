import { create } from 'zustand';
import { GameState, GameAction, Player, TelegramUser, WebSocketMessage } from '../types/game';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
const ACTION_COOLDOWN = 1000; // 1 секунда между действиями

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
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

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
        isSearching: false
    },
    reconnectAttempts: 0,
    lastActionTime: 0
};

export const useGameState = create<GameStore>((set, get) => ({
    gameState: initialGameState,
    telegramUser: null,
    isConnected: false,
    ws: null,

    connect: () => {
        const { telegramUser, gameState } = get();
        if (!telegramUser?.id) {
            console.error('Cannot connect: no user ID');
            return;
        }

        // Если превышено количество попыток переподключения
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

        const wsUrl = `${WS_URL}/${telegramUser.id}`;
        const ws = new WebSocket(wsUrl);
        
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

        ws.onmessage = (event) => {
            try {
                console.log('Received WebSocket message:', event.data);
                const data: WebSocketMessage = JSON.parse(event.data);
                
                // Проверяем timestamp сообщения
                if (Date.now() - data.timestamp > 30000) { // 30 секунд
                    console.warn('Received outdated message');
                    return;
                }

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
                                    playersCount: data.data.players_count,
                                    requiredPlayers: data.data.required_players,
                                    minBet: data.data.min_bet,
                                    maxBet: data.data.max_bet,
                                    waitingPlayers: data.data.waiting_players || [],
                                    isSearching: true
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
                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                get().handleError('Ошибка обработки сообщения от сервера');
            }
        };

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

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            get().handleError('Ошибка соединения с сервером');
        };
    },

    disconnect: () => {
        const { ws } = get();
        if (ws) {
            ws.close();
            set({ ws: null, isConnected: false });
        }
    },

    initTelegramUser: () => {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            set({ telegramUser: user });
            return user;
        }
        return null;
    },

    makeAction: (action: GameAction) => {
        const { ws, isConnected, gameState } = get();
        
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

    handleError: (error: string) => {
        console.error('Game error:', error);
        set(state => ({
            gameState: {
                ...state.gameState,
                status: 'error',
                error
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
    if (action.action === 'bet' && action.amount) {
        if (action.amount < gameState.matchmaking.minBet || 
            action.amount > gameState.matchmaking.maxBet) {
            console.error('Invalid bet amount');
            return false;
        }
    }
    
    return true;
} 