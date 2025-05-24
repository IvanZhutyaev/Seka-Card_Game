import { jest } from '@jest/globals';
import { ProfileComponent } from '../../modules/components/profile.component.js';

describe('ProfileComponent', () => {
    let component;
    let mockServices;
    let mockEventBus;

    beforeEach(() => {
        // Создаем моки для сервисов
        mockServices = {
            profile: {
                loadProfile: jest.fn(),
                updateProfile: jest.fn(),
                updateStats: jest.fn(),
                updateSettings: jest.fn()
            },
            security: {
                sanitizeData: jest.fn(data => data),
                validateFile: jest.fn(file => Promise.resolve({ file }))
            },
            storage: {
                getUserData: jest.fn()
            }
        };

        // Создаем мок для EventBus
        mockEventBus = {
            emit: jest.fn()
        };

        // Создаем тестовый DOM
        document.body.innerHTML = `
            <div id="avatar"></div>
            <div id="avatar-text"></div>
            <div id="username"></div>
            <div id="user-id"></div>
            <div id="balance"></div>
            <div id="games-played"></div>
            <div id="games-won"></div>
            <div id="win-rate"></div>
            <div id="total-winnings"></div>
            <input type="checkbox" id="notifications-toggle" checked>
            <input type="checkbox" id="sounds-toggle" checked>
        `;

        component = new ProfileComponent(mockServices, mockEventBus);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should load profile on initialization', async () => {
            await component.init();
            expect(mockServices.profile.loadProfile).toHaveBeenCalled();
        });
    });

    describe('updateProfile', () => {
        it('should update profile and emit event', async () => {
            const user = { name: 'Test User' };
            mockServices.profile.updateProfile.mockResolvedValue(true);

            const result = await component.updateProfile(user);

            expect(mockServices.security.sanitizeData).toHaveBeenCalledWith(user);
            expect(mockServices.profile.updateProfile).toHaveBeenCalledWith(user);
            expect(mockEventBus.emit).toHaveBeenCalledWith('profile:updated', user);
            expect(result).toBe(true);
        });

        it('should handle errors when updating profile', async () => {
            const user = { name: 'Test User' };
            mockServices.profile.updateProfile.mockRejectedValue(new Error('Update failed'));

            const result = await component.updateProfile(user);

            expect(result).toBe(false);
        });
    });

    describe('updateSettings', () => {
        it('should update settings and emit event', async () => {
            const settings = { notifications: true };
            mockServices.profile.updateSettings.mockResolvedValue(true);

            const result = await component.updateSettings(settings);

            expect(mockServices.security.sanitizeData).toHaveBeenCalledWith(settings);
            expect(mockServices.profile.updateSettings).toHaveBeenCalledWith(settings);
            expect(mockEventBus.emit).toHaveBeenCalledWith('profile:settings-updated', settings);
            expect(result).toBe(true);
        });
    });

    describe('handleAvatarClick', () => {
        it('should create and trigger file input', () => {
            const createElementSpy = jest.spyOn(document, 'createElement');
            const appendChildSpy = jest.spyOn(document.body, 'appendChild');
            const clickSpy = jest.spyOn(HTMLInputElement.prototype, 'click');

            component.handleAvatarClick();

            expect(createElementSpy).toHaveBeenCalledWith('input');
            expect(appendChildSpy).toHaveBeenCalled();
            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe('DOM manipulation', () => {
        it('should show profile elements', () => {
            component.show();
            expect(document.getElementById('avatar').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('username').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('user-id').classList.contains('hidden')).toBe(false);
        });

        it('should hide profile elements', () => {
            component.hide();
            expect(document.getElementById('avatar').classList.contains('hidden')).toBe(true);
            expect(document.getElementById('username').classList.contains('hidden')).toBe(true);
            expect(document.getElementById('user-id').classList.contains('hidden')).toBe(true);
        });
    });
}); 