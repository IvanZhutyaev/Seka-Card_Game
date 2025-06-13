export interface UserInfo {
  id: string;
  photo_url?: string;
  first_name?: string;
}

export interface Card {
  rank: string;
  suit: string;
}

export interface Player {
  id: string;
  user_info?: UserInfo;
  bet: number;
  total_bet: number;
  cards: Card[];
  is_folded: boolean;
} 