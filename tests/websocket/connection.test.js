import { jest } from '@jest/globals';
import { io } from 'socket.io-client';
import { WebApp } from '@twa-dev/sdk';

jest.mock('socket.io-client');
jest.mock('@twa-dev/sdk');

describe('WebSocket Connection', () => {
  let mockSocket;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="app"></div>';
    
    // Mock socket.io
    mockSocket = {
      on: jest.fn(),
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
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    delete window.SOCKET_URL;
  });
  
  test('connects to server on initialization', async () => {
    // Import app.js which will initialize the connection
    await import('../../public/js/app.js');
    
    // Trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    expect(io).toHaveBeenCalledWith('ws://test:3000', expect.objectContaining({
      transports: ['websocket'],
      autoConnect: false
    }));
    expect(mockSocket.connect).toHaveBeenCalled();
  });
  
  test('emits user data on connection', async () => {
    await import('../../public/js/app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    // Simulate connection event
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1];
    
    connectHandler();
    
    expect(mockSocket.emit).toHaveBeenCalledWith('user:init', {
      userId: '123',
      username: 'testuser'
    });
  });
  
  test('handles connection errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await import('../../public/js/app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    // Simulate error event
    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )[1];
    
    errorHandler(new Error('Connection failed'));
    
    expect(consoleSpy).toHaveBeenCalledWith('Connection error:', expect.any(Error));
    expect(document.querySelector('.error-message')).toBeTruthy();
    
    consoleSpy.mockRestore();
  });
  
  test('shows error when WebApp is not initialized', async () => {
    WebApp.isInitialized = false;
    
    await expect(import('../../public/js/app.js')).rejects.toThrow('Telegram Mini App not initialized');
    expect(document.body.innerHTML).toContain('Telegram Mini App not initialized');
  });
}); 