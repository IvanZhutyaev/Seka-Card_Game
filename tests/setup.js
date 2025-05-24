import '@testing-library/jest-dom';
import { mockServices } from './mocks/services';

// Mock services
jest.mock('../modules/services/storage.service', () => ({
    StorageService: jest.fn().mockImplementation(() => mockServices.storage)
}));

jest.mock('../modules/services/profile.service', () => ({
    ProfileService: jest.fn().mockImplementation(() => mockServices.profile)
}));

jest.mock('../modules/services/settings.service', () => ({
    SettingsService: jest.fn().mockImplementation(() => mockServices.settings)
}));

jest.mock('../modules/services/help.service', () => ({
    HelpService: jest.fn().mockImplementation(() => mockServices.help)
}));

jest.mock('../modules/services/notifications.service', () => ({
    NotificationsService: jest.fn().mockImplementation(() => mockServices.notifications)
}));

jest.mock('../modules/services/leaderboard.service', () => ({
    LeaderboardService: jest.fn().mockImplementation(() => mockServices.leaderboard)
}));

jest.mock('../modules/services/chat.service', () => ({
    ChatService: jest.fn().mockImplementation(() => mockServices.chat)
}));

jest.mock('../modules/services/game.service', () => ({
    GameService: jest.fn().mockImplementation(() => mockServices.game)
}));

jest.mock('../modules/services/error.service', () => ({
    ErrorService: jest.fn().mockImplementation(() => mockServices.error)
}));

jest.mock('../modules/services/loading.service', () => ({
    LoadingService: jest.fn().mockImplementation(() => mockServices.loading)
}));

jest.mock('../modules/services/empty.service', () => ({
    EmptyService: jest.fn().mockImplementation(() => mockServices.empty)
}));

jest.mock('../modules/services/confirm.service', () => ({
    ConfirmService: jest.fn().mockImplementation(() => mockServices.confirm)
}));

jest.mock('../modules/services/modal.service', () => ({
    ModalService: jest.fn().mockImplementation(() => mockServices.modal)
}));

jest.mock('../modules/services/security.service', () => ({
    SecurityService: jest.fn().mockImplementation(() => mockServices.security)
}));

// Mock WebApp from @twa-dev/sdk
jest.mock('@twa-dev/sdk', () => ({
    WebApp: {
        ready: jest.fn(),
        initData: {
            user: {
                id: '123',
                username: 'testuser'
            }
        },
        isInitialized: true,
        expand: jest.fn(),
        enableClosingConfirmation: jest.fn(),
        close: jest.fn(),
        showAlert: jest.fn(),
        showConfirm: jest.fn(),
        showPopup: jest.fn(),
        hapticFeedback: jest.fn()
    }
}));

// Mock TelegramUtils
global.TelegramUtils = {
    hapticFeedback: jest.fn()
};

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
    io: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn()
    }))
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Set up DOM environment
document.body.innerHTML = `
    <div id="app">
        <div id="profile">
            <div id="avatar"></div>
            <div id="avatar-text"></div>
            <div id="username"></div>
            <div id="user-id"></div>
            <div id="balance"></div>
            <div id="games-played"></div>
            <div id="games-won"></div>
            <div id="win-rate"></div>
            <div id="total-winnings"></div>
        </div>
        <div id="menu">
            <button class="menu-button"></button>
            <div id="dropdownMenu" class="dropdown-menu">
                <a href="#" class="dropdown-item" data-page="rules">Rules</a>
                <a href="#" class="dropdown-item" data-page="settings">Settings</a>
            </div>
        </div>
        <div id="settings">
            <input type="checkbox" id="notifications-toggle" checked>
            <input type="checkbox" id="sounds-toggle" checked>
        </div>
        <div id="help"></div>
        <div id="notifications"></div>
        <div id="leaderboard"></div>
        <div id="chat"></div>
        <div id="game">
            <div class="game-board">
                <div class="game-board__table"></div>
                <div class="game-board__players"></div>
                <div class="game-board__game-over"></div>
            </div>
        </div>
        <div id="error"></div>
        <div id="loading"></div>
        <div id="empty"></div>
        <div id="confirm"></div>
        <div id="modal"></div>
    </div>
`; 