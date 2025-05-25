/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameState } from '../../pages/gameplay/store/gameStore';

jest.mock('../../pages/gameplay/store/gameStore');

describe('Menu Component', () => {
    const mockGameState = {
        status: 'waiting',
        bank: 0,
        current_turn: null,
        players: {}
    };

    const mockActions = {
        exitGame: jest.fn(),
        toggleSound: jest.fn(),
        toggleNotifications: jest.fn(),
        openRules: jest.fn(),
        openSettings: jest.fn()
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

    test('renders menu button and items', () => {
        render(<Menu />);
        expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
        expect(screen.getByText('Rules')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    test('toggles menu visibility', () => {
        render(<Menu />);
        const menuButton = screen.getByRole('button', { name: 'Menu' });
        const menu = screen.getByRole('menu');

        // Initially hidden
        expect(menu).not.toHaveClass('show');

        // Show menu
        fireEvent.click(menuButton);
        expect(menu).toHaveClass('show');

        // Hide menu
        fireEvent.click(menuButton);
        expect(menu).not.toHaveClass('show');
    });

    test('handles menu item clicks', () => {
        render(<Menu />);
        const menuButton = screen.getByRole('button', { name: 'Menu' });
        
        // Open menu
        fireEvent.click(menuButton);

        // Click Rules
        fireEvent.click(screen.getByText('Rules'));
        expect(mockActions.openRules).toHaveBeenCalled();
        expect(screen.getByRole('menu')).not.toHaveClass('show');

        // Click Settings
        fireEvent.click(screen.getByText('Settings'));
        expect(mockActions.openSettings).toHaveBeenCalled();
        expect(screen.getByRole('menu')).not.toHaveClass('show');
    });

    test('handles sound toggle', () => {
        render(<Menu />);
        const soundButton = screen.getByRole('button', { name: 'Toggle Sound' });
        fireEvent.click(soundButton);
        expect(mockActions.toggleSound).toHaveBeenCalled();
    });

    test('handles notifications toggle', () => {
        render(<Menu />);
        const notificationsButton = screen.getByRole('button', { name: 'Toggle Notifications' });
        fireEvent.click(notificationsButton);
        expect(mockActions.toggleNotifications).toHaveBeenCalled();
    });

    test('handles exit game', () => {
        render(<Menu />);
        const exitButton = screen.getByRole('button', { name: 'Exit Game' });
        fireEvent.click(exitButton);
        expect(mockActions.exitGame).toHaveBeenCalled();
    });

    test('closes menu when clicking outside', () => {
        render(<Menu />);
        const menuButton = screen.getByRole('button', { name: 'Menu' });
        const menu = screen.getByRole('menu');

        // Open menu
        fireEvent.click(menuButton);
        expect(menu).toHaveClass('show');

        // Click outside
        fireEvent.mouseDown(document.body);
        expect(menu).not.toHaveClass('show');
    });
}); 