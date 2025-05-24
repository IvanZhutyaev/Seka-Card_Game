import { create } from 'zustand';
import { GameState, GameAction } from '../types/game';

interface GameStore {
    gameState: GameState;
    playerId: string | null;
    gameId: string | null;
    isConnected: boolean;
    ws: WebSocket | null;
    telegramUser: TelegramUser | null;
    
    connect: () => void;
    disconnect: () => void;
    setGameState: (state: GameState) => void;
    setPlayerId: (id: string) => void;
    setGameId: (id: string) => void;
    
    findGame: (rating?: number) => void;
    placeBet: (amount: number) => void;
    fold: () => void;
    
    initTelegramUser: () => TelegramUser | null;
    exitGame: () => void;
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export const useGameState = create<GameStore>((set, get) => ({
    gameState: {
        status: 'waiting',
        bank: 0,
        current_turn: null,
        players: {}
    },
    playerId: null,
    gameId: null,
    isConnected: false,
    ws: null,
    telegramUser: null,
    
    initTelegramUser: () => {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            set({ telegramUser: user });
            return user;
        }
        return null;
    },
    
    connect: () => {
        const { playerId, telegramUser } = get();
        if (!playerId) {
            // Используем Telegram ID как playerId
            const tgId = telegramUser?.id || `player_${Math.random().toString(36).substr(2, 9)}`;
            set({ playerId: tgId.toString() });
        }
        
        const ws = new WebSocket(`${WEBSOCKET_URL}/${playerId}`);
        
        ws.onopen = () => {
            set({ isConnected: true, ws });
            console.log('WebSocket connected');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'game_state':
                    set({ gameState: data.data });
                    break;
                    
                case 'game_found':
                    set({ gameId: data.game_id });
                    break;
                    
                case 'game_over':
                    alert(`Игра окончена! Победитель: Игрок ${data.winner}\nБанк: ${data.bank}`);
                    set({
                        gameId: null,
                        gameState: {
                            status: 'waiting',
                            bank: 0,
                            current_turn: null,
                            players: {}
                        }
                    });
                    break;
                    
                case 'error':
                    console.error('Game error:', data.message);
                    break;
            }
        };
        
        ws.onclose = () => {
            set({ isConnected: false, ws: null });
            console.log('WebSocket disconnected');
            
            // Пытаемся переподключиться через 5 секунд
            setTimeout(() => {
                if (!get().isConnected) {
                    get().connect();
                }
            }, 5000);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            ws.close();
        };
    },
    
    disconnect: () => {
        const { ws } = get();
        if (ws) {
            ws.close();
        }
        set({ isConnected: false, ws: null });
    },
    
    setGameState: (state: GameState) => set({ gameState: state }),
    
    setPlayerId: (id: string) => set({ playerId: id }),
    
    setGameId: (id: string) => set({ gameId: id }),
    
    findGame: (rating?: number) => {
        const { ws } = get();
        if (ws) {
            const action: GameAction = { type: 'find_game', rating };
            ws.send(JSON.stringify(action));
        }
    },
    
    placeBet: (amount: number) => {
        const { ws, gameId } = get();
        if (ws && gameId) {
            const action: GameAction = {
                type: 'game_action',
                game_id: gameId,
                action: 'bet',
                amount
            };
            ws.send(JSON.stringify(action));
        }
    },
    
    fold: () => {
        const { ws, gameId } = get();
        if (ws && gameId) {
            const action: GameAction = {
                type: 'game_action',
                game_id: gameId,
                action: 'fold'
            };
            ws.send(JSON.stringify(action));
        }
    },
    
    exitGame: () => {
        const { ws } = get();
        if (ws) {
            ws.close();
        }
        
        if (window.Telegram?.WebApp) {
            Telegram.WebApp.close();
            
            // Если через 0.3 сек WebApp еще открыт — редиректим в бота
            setTimeout(() => {
                window.location.href = "tg://";
            }, 300);
        } else {
            window.close();
        }
    }
})); 