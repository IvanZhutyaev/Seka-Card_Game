/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameState } from '../../pages/gameplay/store/gameStore';

// Mock the gameStore hook
jest.mock('../../pages/gameplay/store/gameStore', () => ({
    useGameState: jest.fn()
}));

describe('GameTable Component', () => {
    const mockGameState = {
        status: 'playing',
        bank: 1000,
        current_turn: 'player1',
        players: {
            player1: {
                bet: 100,
                folded: false,
                hand: {
                    cards: [
                        { str: '♠A' },
                        { str: '♥K' }
                    ]
                }
            },
            player2: {
                bet: 200,
                folded: true,
                hand: {
                    cards: [
                        { str: '♦Q' },
                        { str: '♣J' }
                    ]
                }
            }
        }
    };

    const mockActions = {
        connect: jest.fn(),
        initTelegramUser: jest.fn(() => ({ first_name: 'Test User' })),
        exitGame: jest.fn(),
        placeBet: jest.fn(),
        fold: jest.fn()
    };

    beforeEach(() => {
        useGameState.mockReturnValue({
            gameState: mockGameState,
            ...mockActions
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with correct layout', () => {
        render(<GameTable />);
        expect(screen.getByText('СЕКА')).toBeInTheDocument();
        expect(screen.getByText(/Банк:/)).toBeInTheDocument();
        expect(screen.getByText('1000')).toBeInTheDocument();
    });

    test('initializes game and connects to WebSocket', () => {
        render(<GameTable />);
        expect(mockActions.initTelegramUser).toHaveBeenCalled();
        expect(mockActions.connect).toHaveBeenCalled();
    });

    test('renders players and their hands', () => {
        render(<GameTable />);
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
    });

    test('handles game actions', () => {
        render(<GameTable />);
        
        // Test bet action
        fireEvent.click(screen.getByText('Ставка'));
        expect(mockActions.placeBet).toHaveBeenCalled();

        // Test fold action
        fireEvent.click(screen.getByText('Пас'));
        expect(mockActions.fold).toHaveBeenCalled();
    });

    test('handles game exit', () => {
        render(<GameTable />);
        const exitButton = screen.getByRole('button', { name: '' }); // Exit button has no text
        fireEvent.click(exitButton);
        expect(mockActions.exitGame).toHaveBeenCalled();
    });
}); 