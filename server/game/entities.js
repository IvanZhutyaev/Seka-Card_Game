const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A'];
const VALUES = {
  '9': 9,
  '10': 10,
  'J': 2,
  'Q': 3,
  'K': 4,
  'A': 11,
};

class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    this.value = VALUES[rank];
    // In this implementation, the '9 of Clubs' is not a special joker
  }

  toString() {
    return `${this.rank}${this.suit}`;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
    this.shuffle();
  }

  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        // A standard 24-card deck (9 to Ace)
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count) {
    return this.cards.splice(0, count);
  }
}

class Player {
  constructor(id, username) {
    this.id = id; // This could be a socket.id
    this.username = username;
    this.hand = [];
    this.bet = 0;
    this.folded = false;
    this.isReady = false;
  }

  addCards(cards) {
    this.hand.push(...cards);
  }

  clearHand() {
    this.hand = [];
  }
}

module.exports = { Card, Deck, Player }; 