from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

Base = declarative_base()

class Player(Base):
    __tablename__ = 'players'

    id = Column(BigInteger, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String)
    username = Column(String)
    photo_url = Column(String)
    balance = Column(Integer, nullable=False, default=1000)
    games_played = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    loses = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())

    # Отношения
    transactions = relationship("Transaction", back_populates="player")
    game_players = relationship("GamePlayer", back_populates="player")

class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True)
    game_id = Column(String, ForeignKey('games.id', ondelete='SET NULL'))
    player_id = Column(BigInteger, ForeignKey('players.id', ondelete='CASCADE'), nullable=False)
    amount = Column(Integer, nullable=False)
    action = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Отношения
    player = relationship("Player", back_populates="transactions")
    game = relationship("Game", back_populates="transactions")

class Game(Base):
    __tablename__ = 'games'

    id = Column(String, primary_key=True)
    status = Column(String(20), nullable=False)
    deck = Column(JSON)
    table_cards = Column(JSON)
    pot = Column(Integer, nullable=False, default=0)
    svara_pot = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))

    # Отношения
    transactions = relationship("Transaction", back_populates="game")
    game_players = relationship("GamePlayer", back_populates="game")

class GamePlayer(Base):
    __tablename__ = 'game_players'

    game_id = Column(String, ForeignKey('games.id', ondelete='CASCADE'), primary_key=True)
    player_id = Column(BigInteger, ForeignKey('players.id', ondelete='CASCADE'), primary_key=True)
    cards = Column(JSON)
    bet = Column(Integer, nullable=False, default=0)
    folded = Column(Boolean, nullable=False, default=False)
    score = Column(Integer)
    position = Column(String(10))
    is_turn = Column(Boolean, default=False)

    # Отношения
    game = relationship("Game", back_populates="game_players")
    player = relationship("Player", back_populates="game_players") 