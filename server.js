import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создание Express приложения
const app = express();
const httpServer = createServer(app);

// Настройка CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Настройка rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Лимит запросов с одного IP
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Настройка Socket.IO
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Обработка подключений WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Обработка инициализации пользователя
  socket.on('user:init', (userData) => {
    try {
      // Валидация данных пользователя
      if (!userData || !userData.userId) {
        throw new Error('Invalid user data');
      }
      
      // Сохраняем данные пользователя в сокете
      socket.userData = userData;
      console.log('User initialized:', userData);
      
      // Отправляем подтверждение
      socket.emit('user:initialized', { success: true });
    } catch (error) {
      console.error('Error initializing user:', error);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Обработка ошибок
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 