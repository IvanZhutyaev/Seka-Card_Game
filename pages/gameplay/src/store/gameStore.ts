import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface GameState {
  status: string;
  socket: Socket | null;
  connect: (initData: string) => void;
  disconnect: () => void;
}

const useGameStore = create<GameState>((set, get) => ({
  status: 'disconnected',
  socket: null,
  connect: (initData) => {
    // Prevent multiple connections
    if (get().socket) return;

    // Use the current host for the WebSocket connection.
    // This works for both local development (ws://) and ngrok (wss://).
    const socketURL = window.location.origin;

    const socket = io(socketURL, {
      path: '/ws/socket.io/',
      query: {
        initData: initData
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      set({ status: 'connected', socket });
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      set({ status: 'disconnected', socket: null });
      console.log('Socket disconnected');
    });
    
    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      set({ status: 'error', socket: null });
    });

  },
  disconnect: () => {
    get().socket?.disconnect();
    set({ status: 'disconnected', socket: null });
  },
}));

export default useGameStore; 