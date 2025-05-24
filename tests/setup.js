import { jest } from '@jest/globals';

// Mock WebApp SDK
global.WebApp = {
  isInitialized: true,
  expand: jest.fn(),
  enableClosingConfirmation: jest.fn(),
  close: jest.fn(),
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
  showPopup: jest.fn(),
  hapticFeedback: jest.fn(),
  initData: 'test_init_data',
  initDataUnsafe: {
    user: {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser'
    }
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock window.SOCKET_URL
global.window = {
  ...global.window,
  SOCKET_URL: 'ws://localhost:3000'
};

global.TelegramUtils = {
    hapticFeedback: jest.fn()
}; 