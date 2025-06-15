import { create } from 'zustand';
import { socketService } from '../services/socketService';
import { Player, GameState as GameStateType } from '../types';

interface UserInfo {
  id: string;
  username: string;
}

interface GameState {
  id: string | null;
  pot: number;
  players: Record<string, Player>;
  state: string;
  status: string;
  current_turn: string | null;
  bank: number;
  currentBet: number;
  min_bet: number;
  max_bet: number;
  folded_players: string[];
}

interface GameStore {
  gameState: GameStateType | null;
  error: string | null;
  isConnected: boolean;
  playerId: string | null;
  connect: () => void;
  disconnect: () => void;
  createGame: () => void;
  joinGame: (gameId: string, username: string) => void;
  startGame: (gameId: string) => void;
  placeBet: (amount: number) => void;
  fold: () => void;
  cancelWaiting: () => void;
  setPlayerId: (id: string) => void;
  clearError: () => void;
}

const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  error: null,
  isConnected: false,
  playerId: null,

  connect: () => {
    socketService.connect();
    
    socketService.on('connect', () => {
      set({ isConnected: true });
    });

    socketService.on('disconnect', () => {
      set({ isConnected: false, gameState: null });
    });

    socketService.on('gameCreated', (state: GameStateType) => {
      set({ gameState: state, error: null });
    });

    socketService.on('updateState', (state: GameStateType) => {
      set({ gameState: state, error: null });
    });

    socketService.on('error', ({ message }: { message: string }) => {
      set({ error: message });
    });
  },

  disconnect: () => {
    socketService.disconnect();
  },
  
  createGame: () => {
    socketService.createGame();
  },

  joinGame: (gameId: string, username: string) => {
    socketService.joinGame(gameId, { username });
  },
  
  startGame: (gameId: string) => {
    if(!gameId) {
        console.error("No game ID provided to start the game.");
        set({ error: "Cannot start game without a game ID." });
        return;
    }
    socketService.startGame(gameId);
  },

  placeBet: (amount: number) => {
    const { gameState } = get();
    if (gameState?.id) {
      socketService.placeBet(gameState.id, amount);
    }
  },

  fold: () => {
    const { gameState } = get();
    if (gameState?.id) {
      socketService.fold(gameState.id);
    }
  },

  cancelWaiting: () => {
    const { gameState } = get();
    if (gameState?.id) {
      socketService.cancelWaiting(gameState.id);
    }
  },

  setPlayerId: (id: string) => {
    set({ playerId: id });
  },

  clearError: () => set({ error: null }),
})); 

export default useGameStore; 