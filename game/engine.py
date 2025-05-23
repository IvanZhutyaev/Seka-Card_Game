import random
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class CardSuit(str, Enum):
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"

class CardRank(str, Enum):
    ACE = "A"
    KING = "K"
    QUEEN = "Q"
    JACK = "J"
    TEN = "10"
    NINE = "9"
    EIGHT = "8"
    SEVEN = "7"
    SIX = "6"

@dataclass
class Card:
    suit: CardSuit
    rank: CardRank
    
    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"
    
    def to_dict(self) -> Dict:
        return {
            "suit": self.suit,
            "rank": self.rank,
            "str": str(self)
        }

class Deck:
    def __init__(self):
        self.cards: List[Card] = []
        self.reset()
    
    def reset(self):
        """Создает новую колоду"""
        self.cards = [
            Card(suit, rank)
            for suit in CardSuit
            for rank in CardRank
        ]
        random.shuffle(self.cards)
    
    def draw(self, count: int = 1) -> List[Card]:
        """Берет карты из колоды"""
        if count > len(self.cards):
            self.reset()
        
        drawn = self.cards[:count]
        self.cards = self.cards[count:]
        return drawn

class HandRank(Enum):
    SEKA = 4  # Три карты одного достоинства
    PAIR = 3  # Пара
    HIGH_CARD = 2  # Старшая карта
    NOTHING = 1  # Ничего

@dataclass
class Hand:
    cards: List[Card]
    
    def evaluate(self) -> tuple[HandRank, List[Card]]:
        """Оценивает комбинацию карт"""
        if len(self.cards) != 3:
            return HandRank.NOTHING, []
            
        # Проверяем на Секу (три одинаковых)
        ranks = [card.rank for card in self.cards]
        if len(set(ranks)) == 1:
            return HandRank.SEKA, self.cards
            
        # Проверяем на пару
        for rank in set(ranks):
            if ranks.count(rank) == 2:
                pair_cards = [c for c in self.cards if c.rank == rank]
                other_cards = [c for c in self.cards if c.rank != rank]
                return HandRank.PAIR, pair_cards + other_cards
                
        # Старшая карта
        sorted_cards = sorted(
            self.cards,
            key=lambda c: list(CardRank).index(c.rank),
            reverse=True
        )
        return HandRank.HIGH_CARD, sorted_cards

    def to_dict(self) -> Dict:
        return {
            "cards": [card.to_dict() for card in self.cards],
            "rank": self.evaluate()[0].name,
        }

class GameState:
    def __init__(self):
        self.deck = Deck()
        self.players: Dict[str, Hand] = {}
        self.bets: Dict[str, int] = {}
        self.bank: int = 0
        self.current_turn: Optional[str] = None
        self.status: str = "waiting"
        self.folded_players: set = set()
        
    def add_player(self, player_id: str) -> None:
        """Добавляет игрока в игру"""
        if player_id not in self.players:
            self.players[player_id] = Hand([])
            self.bets[player_id] = 0
    
    def deal_cards(self) -> None:
        """Раздает карты всем игрокам"""
        for player_id in self.players:
            if player_id not in self.folded_players:
                self.players[player_id] = Hand(self.deck.draw(3))
    
    def place_bet(self, player_id: str, amount: int) -> bool:
        """Игрок делает ставку"""
        if player_id in self.folded_players:
            return False
            
        self.bets[player_id] = amount
        self.bank += amount
        return True
    
    def fold(self, player_id: str) -> None:
        """Игрок сбрасывает карты"""
        self.folded_players.add(player_id)
    
    def get_winner(self) -> Optional[str]:
        """Определяет победителя"""
        active_players = [
            pid for pid in self.players
            if pid not in self.folded_players
        ]
        
        if len(active_players) == 1:
            return active_players[0]
            
        best_hand = (HandRank.NOTHING, [])
        winner = None
        
        for player_id in active_players:
            hand = self.players[player_id]
            rank, cards = hand.evaluate()
            
            if rank.value > best_hand[0].value:
                best_hand = (rank, cards)
                winner = player_id
            elif rank.value == best_hand[0].value:
                # Сравниваем карты при одинаковом ранге
                for i in range(len(cards)):
                    if list(CardRank).index(cards[i].rank) > list(CardRank).index(best_hand[1][i].rank):
                        best_hand = (rank, cards)
                        winner = player_id
                        break
                    elif list(CardRank).index(cards[i].rank) < list(CardRank).index(best_hand[1][i].rank):
                        break
        
        return winner
    
    def to_dict(self) -> Dict:
        return {
            "status": self.status,
            "bank": self.bank,
            "current_turn": self.current_turn,
            "players": {
                pid: {
                    "hand": hand.to_dict() if pid not in self.folded_players else None,
                    "bet": self.bets[pid],
                    "folded": pid in self.folded_players
                }
                for pid, hand in self.players.items()
            }
        } 