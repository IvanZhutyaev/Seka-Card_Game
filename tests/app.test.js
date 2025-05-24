import { jest } from '@jest/globals';
import { App } from '../modules/app.js';
import { mockServices } from './mocks/services';

describe('App', () => {
    let app;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        app = new App();
    });

    describe('constructor', () => {
        it('should initialize services', () => {
            expect(app.services).toBeDefined();
            expect(app.services.config).toBeDefined();
            expect(app.services.utils).toBeDefined();
            expect(app.services.storage).toBeDefined();
            expect(app.services.image).toBeDefined();
            expect(app.services.profile).toBeDefined();
            expect(app.services.navigation).toBeDefined();
            expect(app.services.security).toBeDefined();
        });

        it('should initialize event bus', () => {
            expect(app.eventBus).toBeDefined();
            expect(app.eventBus.events).toBeDefined();
        });

        it('should initialize components', () => {
            expect(app.components).toBeDefined();
            expect(app.components.profile).toBeDefined();
            expect(app.components.menu).toBeDefined();
            expect(app.components.settings).toBeDefined();
            expect(app.components.help).toBeDefined();
            expect(app.components.notifications).toBeDefined();
            expect(app.components.leaderboard).toBeDefined();
            expect(app.components.chat).toBeDefined();
            expect(app.components.game).toBeDefined();
            expect(app.components.error).toBeDefined();
            expect(app.components.loading).toBeDefined();
            expect(app.components.empty).toBeDefined();
            expect(app.components.confirm).toBeDefined();
            expect(app.components.modal).toBeDefined();
        });
    });

    describe('init', () => {
        it('should initialize security service if init method exists', async () => {
            await app.init();
            expect(mockServices.security.init).toHaveBeenCalled();
        });

        it('should initialize components with init method', async () => {
            await app.init();
            // Check if all components with init method were initialized
            Object.values(app.components).forEach(component => {
                if (component.init) {
                    expect(component.init).toHaveBeenCalled();
                }
            });
        });
    });

    describe('EventBus', () => {
        it('should handle event subscription', () => {
            const handler = jest.fn();
            app.eventBus.on('test:event', handler);
            expect(app.eventBus.events['test:event']).toContain(handler);
        });

        it('should handle event unsubscription', () => {
            const handler = jest.fn();
            app.eventBus.on('test:event', handler);
            app.eventBus.off('test:event', handler);
            expect(app.eventBus.events['test:event']).not.toContain(handler);
        });

        it('should emit events to subscribers', () => {
            const handler = jest.fn();
            app.eventBus.on('test:event', handler);
            app.eventBus.emit('test:event', { data: 'test' });
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });
    });
}); 