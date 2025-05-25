export interface Card {
    suit: '♠' | '♥' | '♦' | '♣';
    rank: 'A' | 'K' | 'Q' | 'J' | '10';
    str: string;
    isJoker?: boolean;
}

export type HandRank = 
    | 'high_card'
    | 'pair'
    | 'two_pair'
    | 'three_of_a_kind'
    | 'straight'
    | 'flush'
    | 'full_house'
    | 'four_of_a_kind'
    | 'straight_flush';

export interface Hand {
    cards: Card[];
    points: number;
    sameSuit: boolean;
    combinations: {
        threeOfAKind?: boolean;
        twoOfAKind?: boolean;
        highCard: Card;
    };
}

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

export interface Player {
    id: string;
    name: string;
    balance: number;
    cards: Card[];
    isActive: boolean;
    user: TelegramUser;
    hand?: Hand;
    bet: number;
    folded: boolean;
    isDealer: boolean;
    isInSvara: boolean;
    svaraBet?: number;
}

export interface GameState {
    status: 'waiting' | 'playing' | 'finished' | 'svara';
    bank: number;
    current_turn: string | null;
    players: Record<string, Player>;
    currentBet: number;
    round: 'dealing' | 'bidding' | 'showdown';
    lastAction?: {
        type: 'bet' | 'fold' | 'check' | 'call' | 'raise';
        playerId: string;
        amount?: number;
    };
    winners?: {
        playerIds: string[];
        points: number;
        split: boolean;
        svara: boolean;
        svaraBank?: number;
    };
}

export interface GameAction {
    type: 'find_game' | 'game_action';
    game_id?: string;
    action?: 'bet' | 'fold' | 'check' | 'call' | 'raise';
    amount?: number;
    rating?: number;
    svara?: boolean;
    svaraBet?: number;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: {
                ready: () => void;
                expand: () => void;
                close: () => void;
                initDataUnsafe: {
                    user?: TelegramUser;
                };
            };
        };
    }
} 