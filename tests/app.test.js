/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WebApp } from '@twa-dev/sdk';
import { useGameState } from '../pages/gameplay/store/gameStore';

jest.mock('@twa-dev/sdk');
jest.mock('../pages/gameplay/store/gameStore');

describe('App', () => {
    const mockGameState = {
        status: 'waiting',
        bank: 0,
        current_turn: null,
        players: {}
    };

    const mockServices = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        setGameState: jest.fn(),
        setPlayerId: jest.fn(),
        setGameId: jest.fn(),
        findGame: jest.fn(),
        placeBet: jest.fn(),
        fold: jest.fn(),
        initTelegramUser: jest.fn(() => ({
            id: '123',
            first_name: 'Test',
            username: 'testuser'
        })),
        exitGame: jest.fn()
    };

    beforeEach(() => {
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

        // Mock gameStore hook
        useGameState.mockReturnValue({
            gameState: mockGameState,
            ...mockServices
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('initializes correctly', () => {
        render(<App />);
        expect(mockServices.initTelegramUser).toHaveBeenCalled();
        expect(mockServices.connect).toHaveBeenCalled();
        expect(WebApp.expand).toHaveBeenCalled();
        expect(WebApp.enableClosingConfirmation).toHaveBeenCalled();
    });

    test('handles game search', () => {
        render(<App />);
        const findGameButton = screen.getByText('Найти игру');
        fireEvent.click(findGameButton);
        expect(mockServices.findGame).toHaveBeenCalled();
    });

    test('handles game exit', () => {
        render(<App />);
        const exitButton = screen.getByRole('button', { name: 'Выйти' });
        fireEvent.click(exitButton);
        expect(mockServices.exitGame).toHaveBeenCalled();
    });

    test('updates game state', () => {
        const { rerender } = render(<App />);
        
        // Initial state
        expect(screen.getByText('Поиск игры...')).toBeInTheDocument();

        // Update game state
        const newGameState = {
            ...mockGameState,
            status: 'playing',
            bank: 1000,
            current_turn: 'player1',
            players: {
                player1: {
                    bet: 100,
                    folded: false
                }
            }
        };

        useGameState.mockReturnValue({
            gameState: newGameState,
            ...mockServices
        });

        rerender(<App />);
        expect(screen.getByText('Игра идет')).toBeInTheDocument();
        expect(screen.getByText('1000')).toBeInTheDocument();
    });

    test('handles WebApp not initialized', () => {
        WebApp.isInitialized = false;
        render(<App />);
        expect(screen.getByText('Telegram Mini App not initialized')).toBeInTheDocument();
    });

    test('handles connection errors', () => {
        useGameState.mockReturnValue({
            gameState: mockGameState,
            ...mockServices,
            isConnected: false
        });

        render(<App />);
        expect(screen.getByText('Ошибка подключения')).toBeInTheDocument();
    });
}); 