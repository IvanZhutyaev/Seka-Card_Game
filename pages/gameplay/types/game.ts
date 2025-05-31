import type { TelegramWebAppUser } from './telegram';

export type GameStatus = 'waiting' | 'matchmaking' | 'betting' | 'playing' | 'finished';

export interface MatchmakingState {
    playersCount: number;
    requiredPlayers: number;
    minBet: number;
    maxBet: number;
    waitingPlayers: string[];
}

export interface Player {
    cards: string[];
    bet: number;
    total_bet: number;
    status: 'waiting' | 'ready' | 'playing' | 'folded';
    user_info?: TelegramWebAppUser;
}

export interface GameState {
    status: GameStatus;
    bank: number;
    current_turn: string | null;
    players: Record<string, Player>;
    matchmaking: MatchmakingState;
    round?: string;
    minBet?: number;
    maxBet?: number;
}

export interface GameAction {
    type: 'game_action';
    action: 'bet' | 'fold' | 'check';
    amount?: number;
}

export type { TelegramWebAppUser as TelegramUser }; 