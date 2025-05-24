// Главная точка входа для клиентского JS Seka Card Game

import { WebApp } from '@twa-dev/sdk';
import { io } from 'socket.io-client';

// Конфигурация
const config = {
    socketUrl: window.SOCKET_URL || 'ws://localhost:3000',
    reconnectAttempts: 5,
    reconnectDelay: 1000
};

// Инициализация Telegram Mini App
const tg = WebApp;

// Проверка инициализации Telegram Mini App
if (!tg.isInitialized) {
    console.error('Telegram Mini App not initialized');
    // Показать сообщение пользователю
    document.body.innerHTML = '<div class="error">Telegram Mini App not initialized. Please open in Telegram.</div>';
    throw new Error('Telegram Mini App not initialized');
}

// Инициализация WebSocket соединения
const socket = io(config.socketUrl, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: config.reconnectAttempts,
    reconnectionDelay: config.reconnectDelay
});

// Обработчики событий WebSocket
socket.on('connect', () => {
    console.log('Connected to server');
    // Отправляем данные пользователя на сервер
    socket.emit('user:init', {
        userId: tg.initDataUnsafe.user?.id,
        username: tg.initDataUnsafe.user?.username
    });
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    // Показать сообщение пользователю
    showError('Connection error. Please try again later.');
});

socket.on('error', (error) => {
    console.error('WebSocket error:', error);
    showError('An error occurred. Please try again later.');
});

// Функция для отображения ошибок
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  
    // Удалить сообщение через 5 секунд
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Инициализация приложения
function initApp() {
    try {
    // Настройка Telegram Mini App
        tg.expand();
        tg.enableClosingConfirmation();
    
        // Подключение к WebSocket
        socket.connect();
    
        // Инициализация компонентов
        initComponents();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Error initializing app. Please try again later.');
    }
}

// Инициализация компонентов
function initComponents() {
    try {
    // Здесь будет инициализация компонентов
        console.log('Components initialized');
    } catch (error) {
        console.error('Error initializing components:', error);
        showError('Error initializing components. Please try again later.');
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp); 