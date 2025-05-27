import random
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class Suit(Enum):
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"

class Rank(Enum):
    FOUR = "4"
    NINE = "9"  # Джокер (только трефовая)
    TEN = "10"
    JACK = "J"
    QUEEN = "Q"
    KING = "K"
    ACE = "A"

@dataclass
class Card:
    rank: Rank
    suit: Suit
    is_joker: bool = False
    
    def __str__(self):
        if self.is_joker:
            return f"9{self.suit.value}*"  # Звездочка обозначает джокер
        return f"{self.rank.value}{self.suit.value}"

class GameState:
    def __init__(self):
        self.players: Dict[str, List[Card]] = {}
        self.bank: int = 0
        self.current_bet: int = 0
        self.current_turn: Optional[str] = None
        self.folded_players: set = set()
        self.deck: List[Card] = []
        self._init_deck()
    
    def _init_deck(self):
        """Инициализация колоды из 21 карты"""
        self.deck = []
        
        # Добавляем карты по правилам:
        # 4-короля, 4-дамы, 4-десятки, 4-валета, 4-туза и один 9треф (джокер)
        for suit in Suit:
            # Добавляем по 4 карты каждого достоинства
            for rank in [Rank.FOUR, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE]:
                for _ in range(4):
                    self.deck.append(Card(rank, suit))
            
            # Добавляем джокер (9 треф)
            if suit == Suit.CLUBS:
                self.deck.append(Card(Rank.NINE, suit, is_joker=True))
        
        random.shuffle(self.deck)
    
    def add_player(self, player_id: str) -> bool:
        """Добавление игрока в игру"""
        if len(self.players) >= 6:  # Изменено с 2 на 6
            return False
        self.players[player_id] = []
        if len(self.players) == 1:
            self.current_turn = player_id
        return True
    
    def deal_cards(self):
        """Раздача карт игрокам"""
        if len(self.players) != 6:  # Изменено с 2 на 6
            return False
        
        # Раздаем по 3 карты каждому игроку
        for _ in range(3):
            for player_id in self.players:
                if self.deck:
                    self.players[player_id].append(self.deck.pop())
        return True
    
    def place_bet(self, player_id: str, amount: int) -> bool:
        """Размещение ставки"""
        if player_id not in self.players or player_id in self.folded_players:
            return False
        
        if amount < self.current_bet:
            return False
        
        self.bank += amount
        self.current_bet = amount
        
        # Находим следующего активного игрока
        active_players = [pid for pid in self.players if pid not in self.folded_players]
        if not active_players:
            return True
            
        current_index = active_players.index(player_id)
        next_index = (current_index + 1) % len(active_players)
        self.current_turn = active_players[next_index]
        
        return True
    
    def fold(self, player_id: str) -> bool:
        """Игрок сбрасывает карты"""
        if player_id not in self.players or player_id in self.folded_players:
            return False
        
        self.folded_players.add(player_id)
        
        # Если остался один игрок, он побеждает
        active_players = [pid for pid in self.players if pid not in self.folded_players]
        if len(active_players) == 1:
            self.current_turn = active_players[0]
            return True
            
        # Если текущий ход был у сбросившего карты, передаем ход следующему
        if self.current_turn == player_id:
            current_index = active_players.index(player_id)
            next_index = (current_index + 1) % len(active_players)
            self.current_turn = active_players[next_index]
        
        return True
    
    def calculate_score(self, cards: List[Card]) -> int:
        """Подсчет очков для комбинации карт"""
        if not cards:
            return 0
            
        # Сортируем карты по старшинству
        sorted_cards = sorted(cards, key=lambda x: list(Rank).index(x.rank))
        
        # Проверяем на наличие комбинаций
        # 1. Три карты одной масти
        if all(card.suit == sorted_cards[0].suit for card in sorted_cards):
            return 30 + sum(list(Rank).index(card.rank) for card in sorted_cards)
        
        # 2. Три карты по порядку
        ranks = [list(Rank).index(card.rank) for card in sorted_cards]
        if ranks[1] == ranks[0] + 1 and ranks[2] == ranks[1] + 1:
            return 20 + sum(ranks)
        
        # 3. Две карты одной масти
        if sorted_cards[0].suit == sorted_cards[1].suit:
            return 10 + sum(list(Rank).index(card.rank) for card in sorted_cards)
        
        # 4. Старшая карта
        return max(list(Rank).index(card.rank) for card in sorted_cards)
    
    def get_winner(self) -> Optional[str]:
        """Определение победителя"""
        if len(self.folded_players) == 1:
            return next(pid for pid in self.players if pid not in self.folded_players)
        
        if len(self.folded_players) == 2:
            return None
        
        # Сравниваем очки
        scores = {
            pid: self.calculate_score(cards)
            for pid, cards in self.players.items()
            if pid not in self.folded_players
        }
        
        if not scores:
            return None
            
        return max(scores.items(), key=lambda x: x[1])[0]
    
    def to_dict(self) -> dict:
        """Преобразование состояния игры в словарь для передачи клиенту"""
        return {
            "players": {
                pid: [{"rank": card.rank.value, "suit": card.suit.value, "is_joker": card.is_joker} for card in cards]
                for pid, cards in self.players.items()
            },
            "bank": self.bank,
            "current_bet": self.current_bet,
            "current_turn": self.current_turn,
            "folded_players": list(self.folded_players)
        }

    def from_dict(self, data: dict):
        """Восстановление состояния игры из словаря"""
        self.players = {}
        for pid, cards_data in data["players"].items():
            self.players[pid] = [
                Card(
                    rank=Rank(card["rank"]),
                    suit=Suit(card["suit"]),
                    is_joker=card.get("is_joker", False)
                )
                for card in cards_data
            ]
        
        self.bank = data["bank"]
        self.current_bet = data["current_bet"]
        self.current_turn = data["current_turn"]
        self.folded_players = set(data["folded_players"])
        self.deck = []  # Колода не сохраняется, так как она не нужна после раздачи 