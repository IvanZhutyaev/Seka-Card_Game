export interface Card {
  rank: string;
  suit: string;
  is_joker?: boolean;
}

export interface Player {
  cards: Card[];
  bet: number;
  total_bet: number;
  user_info: any;
  status: 'waiting' | 'ready' | 'playing';
}

export interface GameState {
  id: string | null;
  players: Record<string, Player>;
  bank: number;
  current_bet: number;
  currentBet?: number;
  current_turn: string | null;
  folded_players: string[];
  foldedPlayers?: string[];
  deck: Card[];
  status: 'waiting' | 'matchmaking' | 'betting' | 'playing' | 'showdown' | 'svara' | 'finished';
  round: 'waiting' | 'dealing' | 'bidding' | 'showdown';
  svara_players: string[];
  svaraPlayers?: string[];
  ready_players: string[];
  readyPlayers?: string[];
  min_bet: number;
  minBet?: number;
  max_bet: number;
  maxBet?: number;
  winner?: string | null;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

// Единое и полное определение для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: string;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          [key: string]: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        MainButton: {
          isVisible: boolean;
          show(): void;
          hide(): void;
          setText(text: string): void;
        };
        ready(): void;
        expand(): void;
        close(): void;
        showAlert(message: string): void;
      };
    };
  }
} 