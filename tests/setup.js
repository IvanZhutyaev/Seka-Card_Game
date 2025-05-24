import { jest } from '@jest/globals';

// Мок для window.Telegram
global.Telegram = {
    WebApp: {
        ready: jest.fn(),
        expand: jest.fn(),
        close: jest.fn(),
        showAlert: jest.fn(),
        showConfirm: jest.fn(),
        showPopup: jest.fn(),
        hapticFeedback: jest.fn()
    }
};

// Мок для localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Мок для URL.createObjectURL
global.URL.createObjectURL = jest.fn();

global.TelegramUtils = {
    hapticFeedback: jest.fn()
};     