const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Game } = require('./game/game');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity. In production, restrict this.
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

const games = new Map(); // Store all active games

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// For any other route, serve the React index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Game lobby logic
  socket.on('createGame', () => {
    const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
    const game = new Game(gameId);
    games.set(gameId, game);
    socket.join(gameId);
    console.log(`Game created with ID: ${gameId} by ${socket.id}`);
    socket.emit('gameCreated', game.getState());
  });

  socket.on('joinGame', ({ gameId, userInfo }) => {
    const game = games.get(gameId);
    if (game) {
      try {
        const player = game.addPlayer({ id: socket.id, ...userInfo });
        socket.join(gameId);
        console.log(`${player.username} (${socket.id}) joined game ${gameId}`);
        // Notify all players in the room about the new state
        io.to(gameId).emit('updateState', game.getState());
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    } else {
      socket.emit('error', { message: 'Game not found' });
    }
  });
  
  socket.on('startGame', ({ gameId }) => {
    const game = games.get(gameId);
     if (game && game.getPlayer(socket.id)) { // Ensure player is in game
      try {
        game.startGame();
        io.to(gameId).emit('updateState', game.getState());
        console.log(`Game ${gameId} started.`);
      } catch(error) {
        socket.emit('error', { message: error.message });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Handle player disconnection from games
    games.forEach(game => {
      if (game.getPlayer(socket.id)) {
        game.removePlayer(socket.id);
        io.to(game.id).emit('updateState', game.getState());
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
}); 