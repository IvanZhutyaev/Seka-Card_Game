import random
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class Suit(Enum):
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"

class Rank(Enum):
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
        logger.info("Initializing new game state")
        self.players: Dict[str, Dict] = {}  # Изменяем структуру для хранения информации о ставках
        self.bank: int = 0
        self.current_bet: int = 0
        self.current_turn: Optional[str] = None
        self.folded_players: set = set()
        self.deck: List[Card] = []
        self.status: str = 'waiting'  # waiting, playing, showdown, svara, finished
        self.round: str = 'dealing'  # dealing, bidding, showdown
        self.svara_players: set = set()  # участники свары
        self._init_deck()
        logger.info("Game state initialized")
    
    def _init_deck(self):
        """Инициализация колоды из 21 карты"""
        logger.info("Initializing deck")
        self.deck = []
        # Только 10, J, Q, K, A (по 4 каждой масти) и одна 9♣ (джокер)
        for suit in Suit:
            for rank in [Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE]:
                for _ in range(4):
                    self.deck.append(Card(rank, suit))
            if suit == Suit.CLUBS:
                self.deck.append(Card(Rank.NINE, suit, is_joker=True))
        random.shuffle(self.deck)
        logger.info(f"Deck initialized with {len(self.deck)} cards")
    
    def add_player(self, player_id: str, user_info: dict = None) -> bool:
        """Добавление игрока в игру с данными Telegram"""
        logger.info(f"Attempting to add player {player_id}")
        if len(self.players) >= 6:
            logger.warning(f"Cannot add player {player_id}: game is full")
            return False
        self.players[player_id] = {
            'cards': [],
            'bet': 0,
            'total_bet': 0,  # Общая сумма ставок игрока в текущей игре
            'user_info': user_info or {}
        }
        if len(self.players) == 1:
            self.current_turn = player_id
            logger.info(f"First player {player_id} added and set as current turn")
        if len(self.players) == 6:
            self.status = 'playing'
            self.round = 'bidding'
            logger.info("Game is full, changing status to playing and round to bidding")
        logger.info(f"Player {player_id} successfully added to the game")
        return True
    
    def deal_cards(self):
        """Раздача карт игрокам"""
        logger.info("Starting card dealing")
        if len(self.players) != 6:  # Изменено с 2 на 6
            logger.warning(f"Cannot deal cards: wrong number of players ({len(self.players)})")
            return False
        
        # Раздаем по 3 карты каждому игроку
        for _ in range(3):
            for player_id in self.players:
                if self.deck:
                    card = self.deck.pop()
                    self.players[player_id]['cards'].append(card)
                    logger.info(f"Dealt card {card} to player {player_id}")
        logger.info("Card dealing completed")
        return True
    
    def place_bet(self, player_id: str, amount: int) -> bool:
        """Размещение ставки"""
        logger.info(f"Player {player_id} attempting to place bet of {amount}")
        if player_id not in self.players or player_id in self.folded_players:
            logger.warning(f"Cannot place bet: player {player_id} not in game or folded")
            return False
        
        if amount < self.current_bet:
            logger.warning(f"Cannot place bet: amount {amount} less than current bet {self.current_bet}")
            return False
        
        player = self.players[player_id]
        player['bet'] = amount
        player['total_bet'] += amount
        self.bank += amount
        self.current_bet = amount
        logger.info(f"Bet placed successfully. Bank: {self.bank}, Current bet: {self.current_bet}")
        
        # Находим следующего активного игрока
        active_players = [pid for pid in self.players if pid not in self.folded_players]
        if not active_players:
            logger.warning("No active players remaining")
            return True
            
        current_index = active_players.index(player_id)
        next_index = (current_index + 1) % len(active_players)
        self.current_turn = active_players[next_index]
        logger.info(f"Next turn: player {self.current_turn}")
        
        # Проверяем, все ли активные игроки сделали равные ставки
        bets = [self.players[pid]['bet'] for pid in active_players]
        if len(set(bets)) == 1 and self.current_bet > 0:
            self.round = 'showdown'
            logger.info("All players made equal bets, moving to showdown")
        
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
    
    def calculate_score(self, cards):
        """Подсчёт очков: 10, J, Q, K — по 10 очков, A и 9♣ (джокер) — по 11 очков"""
        score = 0
        for card in cards:
            if card.rank in [Rank.ACE]:
                score += 11
            elif card.rank in [Rank.NINE]:  # Джокер
                if card.suit == Suit.CLUBS:
                    score += 11
                else:
                    score += 10
            else:
                score += 10
        return score
    
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
    
    def start_svara(self, svara_players):
        """Запуск раунда свары только для указанных игроков"""
        self.svara_players = set(svara_players)
        self.folded_players = set(pid for pid in self.players if pid not in self.svara_players)
        self.status = 'svara'
        self.round = 'dealing'
        self._init_deck()
        for pid in self.players:
            self.players[pid]['cards'] = []
            self.players[pid]['bet'] = 0
            self.players[pid]['total_bet'] = 0
        self.deal_cards()
        # Первый ход — первому из svara_players
        self.current_turn = list(self.svara_players)[0]
        self.current_bet = 0
        logger.info(f"Svara started for players: {self.svara_players}")

    def showdown_or_svara(self):
        """Проводит вскрытие и определяет победителя или запускает свару"""
        scores = {
            pid: self.calculate_score(self.players[pid]['cards'])
            for pid in self.players if pid not in self.folded_players
        }
        if not scores:
            self.status = 'finished'
            return None
        max_score = max(scores.values())
        winners = [pid for pid, score in scores.items() if score == max_score]
        if len(winners) == 1:
            self.status = 'finished'
            return winners[0]
        else:
            # Запускаем свару между winners
            self.start_svara(winners)
            return None

    def to_dict(self) -> dict:
        """Преобразование состояния игры в словарь для передачи клиенту"""
        state = {
            "players": {
                pid: {
                    **{k: v for k, v in pdata.items() if k != 'cards'},
                    'cards': [str(card) for card in pdata['cards']],
                    'user_info': pdata.get('user_info', {})
                } for pid, pdata in self.players.items()
            },
            "bank": self.bank,
            "current_bet": self.current_bet,
            "current_turn": self.current_turn,
            "folded_players": list(self.folded_players),
            "status": self.status,
            "round": self.round,
            "svara_players": list(self.svara_players) if hasattr(self, 'svara_players') else []
        }
        logger.info(f"Game state converted to dict: {state}")
        return state

    def from_dict(self, data: dict):
        """Восстановление состояния игры из словаря"""
        self.players = {}
        for pid, player_data in data["players"].items():
            self.players[pid] = {
                "cards": [
                    Card(
                        rank=Rank(card["rank"]),
                        suit=Suit(card["suit"]),
                        is_joker=card.get("is_joker", False)
                    )
                    for card in player_data["cards"]
                ],
                "bet": player_data["bet"],
                "total_bet": player_data.get("total_bet", 0),
                "user_info": player_data.get("user_info", {})
            }
        
        self.bank = data["bank"]
        self.current_bet = data["current_bet"]
        self.current_turn = data["current_turn"]
        self.folded_players = set(data["folded_players"])
        self.status = data.get("status", "waiting")
        self.round = data.get("round", "dealing")
        self.svara_players = set(data.get("svara_players", []))
        self.deck = []  # Колода не сохраняется, так как она не нужна после раздачи 