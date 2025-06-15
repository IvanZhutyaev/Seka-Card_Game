const { Deck, Player } = require('./entities');

const GameState = {
  WAITING: 'waiting',      // Waiting for players to join
  BETTING: 'betting',      // Players are placing initial bets
  PLAYING: 'playing',      // Game in progress
  SHOWDOWN: 'showdown',    // Cards are being revealed
  FINISHED: 'finished',    // Game is over
};

class Game {
  constructor(gameId) {
    this.id = gameId;
    this.players = new Map(); // Using a Map to store players by ID
    this.deck = new Deck();
    this.pot = 0;
    this.currentBet = 0;
    this.state = GameState.WAITING;
    this.turn = null; // ID of the player whose turn it is
    this.minPlayers = 2;
    this.maxPlayers = 6;
  }

  addPlayer(playerInfo) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Game is full');
    }
    const player = new Player(playerInfo.id, playerInfo.username);
    this.players.set(player.id, player);
    return player;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  // More methods to be added: startGame, placeBet, fold, etc.
  
  // Example method to start the game
  startGame() {
    if (this.players.size < this.minPlayers) {
      throw new Error('Not enough players to start');
    }
    this.state = GameState.PLAYING;
    this.deck.reset();
    this.deck.shuffle();

    // Deal 3 cards to each player
    for (const player of this.players.values()) {
      player.clearHand();
      player.addCards(this.deck.deal(3));
    }
    
    // Set the first turn
    this.turn = this.players.keys().next().value;
  }
  
  getState() {
    // Return a serializable representation of the game state
    return {
      id: this.id,
      pot: this.pot,
      currentBet: this.currentBet,
      state: this.state,
      turn: this.turn,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        hand: p.hand, // In a real game, you might not send this to everyone
        bet: p.bet,
        folded: p.folded,
        isReady: p.isReady,
      })),
    };
  }
}

module.exports = { Game, GameState }; 