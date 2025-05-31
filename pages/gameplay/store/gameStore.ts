import { create } from 'zustand';
import { GameState, GameAction, Player, TelegramUser } from '../types/game';

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
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export const useGameState = create<GameStore>((set, get) => ({
    gameState: {
        status: 'waiting',
        bank: 0,
        current_turn: null,
        players: {},
        matchmaking: {
            playersCount: 0,
            requiredPlayers: 6,
            minBet: 100,
            maxBet: 2000,
            waitingPlayers: []
        }
    },
    telegramUser: null,
    isConnected: false,
    ws: null,

    connect: () => {
        const { telegramUser } = get();
        if (!telegramUser?.id) {
            console.error('Cannot connect: no user ID');
            return;
        }

        console.log('Attempting to connect to WebSocket...', { userId: telegramUser.id });
        const wsUrl = `${WS_URL}/${telegramUser.id}`;
        console.log('WebSocket URL:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            set({ isConnected: true, ws });
            console.log('WebSocket connected successfully');
            
            // Отправляем initData при подключении
            if (window.Telegram?.WebApp?.initData) {
                console.log('Sending initData...');
                ws.send(JSON.stringify({
                    type: 'init',
                    initData: window.Telegram.WebApp.initData
                }));
                // Добавляем отправку find_game после init
                setTimeout(() => {
                    console.log('Sending find_game...');
                    ws.send(JSON.stringify({ type: 'find_game' }));
                }, 1000);
            } else {
                console.error('No Telegram WebApp init data available');
                ws.close();
            }
        };

        ws.onmessage = (event) => {
            console.log('Received WebSocket message:', event.data);
            const data = JSON.parse(event.data);
            
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
                                playersCount: data.players_count,
                                requiredPlayers: data.required_players,
                                minBet: data.min_bet,
                                maxBet: data.max_bet,
                                waitingPlayers: data.waiting_players || []
                            }
                        }
                    }));
                    break;
                case 'game_state':
                    console.log('Updating game state:', data.state);
                    set({ gameState: data.state });
                    break;
                case 'error':
                    console.error('Game error:', data.message);
                    break;
                case 'player_joined':
                    console.log('Player joined:', data.player);
                    set(state => ({
                        gameState: {
                            ...state.gameState,
                            players: {
                                ...state.gameState.players,
                                [data.player.id]: data.player
                            }
                        }
                    }));
                    break;
                case 'player_left':
                    console.log('Player left:', data.playerId);
                    set(state => {
                        const { [data.playerId]: _, ...remainingPlayers } = state.gameState.players;
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
        };

        ws.onclose = (event) => {
            console.log('WebSocket closed:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            set({ isConnected: false });
            // Пробуем переподключиться через 5 секунд
            setTimeout(() => {
                console.log('Attempting to reconnect...');
                get().connect();
            }, 5000);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
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
        const { ws, isConnected } = get();
        if (ws && isConnected) {
            ws.send(JSON.stringify(action));
        } else {
            console.error('WebSocket not connected');
        }
    },

    exitGame: () => {
        const { ws } = get();
        if (ws) {
            ws.send(JSON.stringify({ type: 'exit_game' }));
            ws.close();
        }
        set({ 
            gameState: {
                status: 'waiting',
                bank: 0,
                current_turn: null,
                players: {}
            },
            isConnected: false,
            ws: null
        });
    }
})); 