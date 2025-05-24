import { jest } from '@jest/globals';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

describe('WebSocket Connection', () => {
  let mockSocket;
  
  beforeEach(() => {
    // Создаем мок сокета
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    };
    
    io.mockReturnValue(mockSocket);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('connects to server on initialization', () => {
    require('../../public/js/app.js');
    expect(mockSocket.connect).toHaveBeenCalled();
  });
  
  test('emits user data on connection', () => {
    require('../../public/js/app.js');
    
    // Симулируем событие подключения
    const connectCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1];
    
    connectCallback();
    
    expect(mockSocket.emit).toHaveBeenCalledWith('user:init', {
      userId: 123456789,
      username: 'testuser'
    });
  });
  
  test('handles connection errors', () => {
    require('../../public/js/app.js');
    
    // Симулируем ошибку подключения
    const errorCallback = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )[1];
    
    errorCallback(new Error('Connection failed'));
    
    // Проверяем, что сообщение об ошибке добавлено в DOM
    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent).toContain('Connection error');
  });
}); 