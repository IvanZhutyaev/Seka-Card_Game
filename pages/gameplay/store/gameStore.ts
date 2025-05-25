import { create } from 'zustand';
import { GameState, GameAction, Player, TelegramUser } from '../types/game';

interface GameStore {
    gameState: GameState;
    telegramUser: TelegramUser | null;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
    initTelegramUser: () => TelegramUser | null;
    makeAction: (action: GameAction) => void;
    exitGame: () => void;
}

const WS_URL = 'ws://localhost:8000/ws/game/';

export const useGameState = create<GameStore>((set, get) => ({
    gameState: {
        status: 'waiting',
        bank: 0,
        current_turn: null,
        players: {}
    },
    telegramUser: null,
    isConnected: false,
    ws: null,

    connect: () => {
        const ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            set({ isConnected: true });
            console.log('WebSocket connected');
            
            // Отправляем данные пользователя при подключении
            const user = get().telegramUser;
            if (user) {
                ws.send(JSON.stringify({
                    type: 'init',
                    user: user
                }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'game_state':
                    set({ gameState: data.state });
                    break;
                case 'error':
                    console.error('Game error:', data.message);
                    break;
                case 'player_joined':
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
            }
        };

        ws.onclose = () => {
            set({ isConnected: false });
            console.log('WebSocket disconnected');
            // Пробуем переподключиться через 5 секунд
            setTimeout(() => get().connect(), 5000);
        };

        set({ ws });
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