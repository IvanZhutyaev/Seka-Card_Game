import { create } from 'zustand';
import { GameState, Player } from '../types';
import { logger } from '../utils/logger';

interface GameStore {
  gameState: GameState;
  playerId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  ws: WebSocket | null;
  error: string | null;
  setPlayerId: (id: string) => void;
  connect: () => void;
  disconnect: () => void;
  placeBet: (amount: number) => void;
  fold: () => void;
  cancelWaiting: () => Promise<void>;
  clearError: () => void;
}

const defaultGameState: GameState = {
  status: 'waiting',
  bank: 0,
  current_bet: 0,
  current_turn: null,
  players: {},
  folded_players: [],
  min_bet: 100,
  max_bet: 2000,
  deck: [],
  round: 'waiting',
  svara_players: [],
  ready_players: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: defaultGameState,
  playerId: null,
  isConnected: false,
  isConnecting: false,
  ws: null,
  error: null,
  setPlayerId: (id: string) => set({ playerId: id }),
  connect: () => {
    const { playerId, ws, isConnecting } = get();
    if ((ws && ws.readyState === WebSocket.OPEN) || isConnecting) {
      logger.info('WebSocket connection attempt already in progress or connected.');
      return;
    }

    if (!playerId) {
      logger.error('Player ID is not set. Cannot connect to WebSocket.');
      set({ error: 'Player ID не установлен.' });
      return;
    }

    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      logger.error('Telegram initData is not available.');
      set({ error: 'Не удалось получить данные Telegram.' });
      return;
    }
    
    const webAppUrl = process.env.REACT_APP_WEB_APP_URL;
    if (!webAppUrl) {
      logger.error("REACT_APP_WEB_APP_URL is not defined in the environment.");
      set({ error: 'URL приложения не настроен.' });
      return;
    }

    const hostname = new URL(webAppUrl).host;
    const wsUrl = `wss://${hostname}/ws/${playerId}?initData=${encodeURIComponent(initData)}`;
    
    set({ isConnecting: true, error: null });
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      logger.info('WebSocket connected');
      set({ isConnected: true, isConnecting: false, ws: newWs });
    };

    newWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        logger.info('Received message:', message);

        switch (message.type) {
          case 'status':
            // Можно использовать для отображения статуса в UI, например, "Вы в очереди"
            break;
          case 'game_created':
          case 'game_state_update':
            set({ gameState: message.game_state });
            break;
          case 'error':
            logger.error('Server error:', message.message);
            set({ error: message.message });
            break;
          default:
            logger.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        logger.error('Error parsing message:', error);
        set({ error: 'Ошибка обработки сообщения от сервера.' });
      }
    };

    newWs.onerror = (event) => {
      logger.error('WebSocket error:', event);
      set({ error: 'Ошибка WebSocket соединения.', isConnecting: false, isConnected: false });
    };

    newWs.onclose = (event) => {
      logger.info(`WebSocket disconnected, Code: ${event.code}, Reason: ${event.reason}`);
      if (!event.wasClean) {
          set({ error: 'Соединение с сервером потеряно. Попробуйте перезагрузить страницу.' });
      }
      set({ isConnected: false, isConnecting: false, ws: null });
    };

  },
  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close(1000, "User disconnected");
    }
    set({ ws: null, isConnected: false, gameState: defaultGameState });
  },
  placeBet: (amount: number) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'place_bet', amount }));
    } else {
      logger.error('Cannot place bet, WebSocket is not connected.');
    }
  },
  fold: () => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'fold' }));
    } else {
      logger.error('Cannot fold, WebSocket is not connected.');
    }
  },
  cancelWaiting: async () => {
    const { ws, playerId } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'cancel_waiting', player_id: playerId }));
    } else {
      logger.error('Cannot cancel waiting, WebSocket is not connected.');
      throw new Error("WebSocket не подключен");
    }
  },
  clearError: () => set({ error: null }),
})); 