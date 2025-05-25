/* eslint-env jest */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGameState } from '../../pages/gameplay/store/gameStore';

jest.mock('../../pages/gameplay/store/gameStore');

describe('Profile Component', () => {
    const mockUser = {
        id: '123',
        first_name: 'Test User',
        username: 'testuser',
        photo_url: 'https://example.com/avatar.jpg'
    };

    const mockStats = {
        gamesPlayed: 100,
        gamesWon: 60,
        winRate: '60%',
        totalWinnings: 5000
    };

    const mockSettings = {
        notifications: true,
        sound: true
    };

    const mockActions = {
        updateProfile: jest.fn(),
        updateStats: jest.fn(),
        updateSettings: jest.fn(),
        uploadAvatar: jest.fn()
    };

    beforeEach(() => {
        useGameState.mockReturnValue({
            user: mockUser,
            stats: mockStats,
            settings: mockSettings,
            ...mockActions
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders profile information', () => {
        render(<Profile />);
        expect(screen.getByText(mockUser.first_name)).toBeInTheDocument();
        expect(screen.getByText(mockUser.username)).toBeInTheDocument();
        expect(screen.getByText(`ID: ${mockUser.id}`)).toBeInTheDocument();
        expect(screen.getByAltText('Profile Avatar')).toHaveAttribute('src', mockUser.photo_url);
    });

    test('renders statistics', () => {
        render(<Profile />);
        expect(screen.getByText(`Games Played: ${mockStats.gamesPlayed}`)).toBeInTheDocument();
        expect(screen.getByText(`Games Won: ${mockStats.gamesWon}`)).toBeInTheDocument();
        expect(screen.getByText(`Win Rate: ${mockStats.winRate}`)).toBeInTheDocument();
        expect(screen.getByText(`Total Winnings: ${mockStats.totalWinnings}`)).toBeInTheDocument();
    });

    test('handles avatar upload', async () => {
        render(<Profile />);
        const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
        const avatarInput = screen.getByTestId('avatar-input');

        Object.defineProperty(avatarInput, 'files', {
            value: [file]
        });

        fireEvent.change(avatarInput);

        await waitFor(() => {
            expect(mockActions.uploadAvatar).toHaveBeenCalledWith(file);
        });
    });

    test('handles settings changes', () => {
        render(<Profile />);
        
        // Toggle notifications
        const notificationsToggle = screen.getByRole('checkbox', { name: 'Notifications' });
        fireEvent.click(notificationsToggle);
        expect(mockActions.updateSettings).toHaveBeenCalledWith({
            ...mockSettings,
            notifications: !mockSettings.notifications
        });

        // Toggle sound
        const soundToggle = screen.getByRole('checkbox', { name: 'Sound' });
        fireEvent.click(soundToggle);
        expect(mockActions.updateSettings).toHaveBeenCalledWith({
            ...mockSettings,
            sound: !mockSettings.sound
        });
    });

    test('shows loading state', () => {
        useGameState.mockReturnValue({
            user: null,
            stats: null,
            settings: null,
            isLoading: true,
            ...mockActions
        });

        render(<Profile />);
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('shows error state', () => {
        useGameState.mockReturnValue({
            user: null,
            stats: null,
            settings: null,
            error: 'Failed to load profile',
            ...mockActions
        });

        render(<Profile />);
        expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });

    test('handles profile update', async () => {
        render(<Profile />);
        const editButton = screen.getByRole('button', { name: 'Edit Profile' });
        fireEvent.click(editButton);

        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        const saveButton = screen.getByRole('button', { name: 'Save' });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockActions.updateProfile).toHaveBeenCalledWith({
                ...mockUser,
                first_name: 'New Name'
            });
        });
    });
}); 