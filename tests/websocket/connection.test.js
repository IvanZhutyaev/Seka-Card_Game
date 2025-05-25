/* eslint-env jest */
import { jest } from '@jest/globals';
import { io } from 'socket.io-client';
import { WebApp } from '@twa-dev/sdk';

jest.mock('socket.io-client');
jest.mock('@twa-dev/sdk');

describe('WebSocket Connection', () => {
    let mockSocket;
    let mockConnect;
    let mockError;
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '<div id="app"></div>';
        
        // Mock socket.io
        mockConnect = jest.fn();
        mockError = jest.fn();
        
        mockSocket = {
            on: jest.fn((event, handler) => {
                if (event === 'connect') mockConnect = handler;
                if (event === 'connect_error') mockError = handler;
            }),
            emit: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        };
        
        io.mockReturnValue(mockSocket);

        // Mock WebApp
        WebApp.isInitialized = true;
        WebApp.initDataUnsafe = {
            user: {
                id: '123',
                username: 'testuser'
            }
        };
        WebApp.expand = jest.fn();
        WebApp.enableClosingConfirmation = jest.fn();

        // Mock window.SOCKET_URL
        window.SOCKET_URL = 'ws://test:3000';

        // Clear any previous error messages
        console.error = jest.fn();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        delete window.SOCKET_URL;
        console.error.mockRestore();
    });
    
    test('connects to server on initialization', async () => {
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        expect(io).toHaveBeenCalledWith('ws://test:3000', expect.objectContaining({
            transports: ['websocket'],
            autoConnect: false
        }));
        expect(mockSocket.connect).toHaveBeenCalled();
    });
    
    test('emits user data on connection', async () => {
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        mockConnect();
        
        expect(mockSocket.emit).toHaveBeenCalledWith('user:init', {
            userId: '123',
            username: 'testuser'
        });
    });
    
    test('handles connection errors', async () => {
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        const error = new Error('Connection failed');
        mockError(error);
        
        expect(console.error).toHaveBeenCalledWith('Connection error:', error);
        
        const errorMessage = document.querySelector('.error-message');
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.textContent).toContain('Connection failed');
    });
    
    test('shows error when WebApp is not initialized', async () => {
        WebApp.isInitialized = false;
        
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        const errorMessage = document.querySelector('.error-message');
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.textContent).toContain('Telegram Mini App not initialized');
    });

    test('reconnects on connection loss', async () => {
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // Simulate initial connection
        mockConnect();
        expect(mockSocket.emit).toHaveBeenCalledWith('user:init', expect.any(Object));

        // Simulate connection loss
        mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1]();

        // Should attempt to reconnect
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
    });

    test('handles server disconnect', async () => {
        // Импортируем app.js для инициализации
        import('../../public/js/app.js');
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // Simulate server disconnect
        mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1]('io server disconnect');

        // Should attempt to reconnect
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
        expect(console.error).toHaveBeenCalledWith('Server disconnected, attempting to reconnect...');
    });
}); 