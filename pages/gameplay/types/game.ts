export interface Card {
    suit: string;
    rank: string;
    str: string;
}

export interface Hand {
    cards: Card[];
    rank: string;
}

export interface Player {
    hand: Hand | null;
    bet: number;
    folded: boolean;
}

export interface GameState {
    status: string;
    bank: number;
    current_turn: string | null;
    players: Record<string, Player>;
}

export type GameAction = 
    | { type: 'find_game', rating?: number }
    | { type: 'game_action', game_id: string, action: 'bet', amount: number }
    | { type: 'game_action', game_id: string, action: 'fold' }; 