import { WebApp } from '@twa-dev/sdk';

// Валидация данных инициализации
export function validateInitData() {
  const tg = WebApp;
  
  if (!tg.isInitialized) {
    throw new Error('Telegram Mini App not initialized');
  }
  
  if (!tg.initData) {
    throw new Error('Init data is missing');
  }
  
  if (!tg.initDataUnsafe?.user) {
    throw new Error('User data is missing');
  }
  
  return true;
}

// Валидация данных пользователя
export function validateUserData(userData) {
  if (!userData) {
    throw new Error('User data is required');
  }
  
  if (!userData.id) {
    throw new Error('User ID is required');
  }
  
  if (typeof userData.id !== 'number') {
    throw new Error('User ID must be a number');
  }
  
  if (userData.username && typeof userData.username !== 'string') {
    throw new Error('Username must be a string');
  }
  
  return true;
}

// Валидация игровых данных
export function validateGameData(gameData) {
  if (!gameData) {
    throw new Error('Game data is required');
  }
  
  if (!gameData.gameId) {
    throw new Error('Game ID is required');
  }
  
  if (typeof gameData.gameId !== 'string') {
    throw new Error('Game ID must be a string');
  }
  
  return true;
}

// Валидация сообщений чата
export function validateChatMessage(message) {
  if (!message) {
    throw new Error('Message is required');
  }
  
  if (!message.text) {
    throw new Error('Message text is required');
  }
  
  if (typeof message.text !== 'string') {
    throw new Error('Message text must be a string');
  }
  
  if (message.text.length > 1000) {
    throw new Error('Message is too long');
  }
  
  return true;
} 