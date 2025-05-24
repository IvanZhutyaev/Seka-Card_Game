import { jest } from '@jest/globals';
import { MenuComponent } from '../../modules/components/menu.component.js';

describe('MenuComponent', () => {
    let component;
    let mockServices;
    let mockEventBus;

    beforeEach(() => {
        // Создаем моки для сервисов
        mockServices = {
            navigation: {
                openPage: jest.fn(),
                handleClickOutside: jest.fn()
            },
            security: {
                sanitizeData: jest.fn(data => data)
            }
        };

        // Создаем мок для EventBus
        mockEventBus = {
            emit: jest.fn()
        };

        // Создаем тестовый DOM
        document.body.innerHTML = `
            <button class="menu-button"></button>
            <div id="dropdownMenu" class="dropdown-menu">
                <a href="#" class="dropdown-item" data-page="rules">Rules</a>
                <a href="#" class="dropdown-item" data-page="settings">Settings</a>
            </div>
        `;

        component = new MenuComponent(mockServices, mockEventBus);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('init', () => {
        it('should set up event listeners on initialization', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
            component.init();
            expect(addEventListenerSpy).toHaveBeenCalled();
        });
    });

    describe('toggleMenu', () => {
        it('should open menu when closed', () => {
            component.toggleMenu();
            expect(document.getElementById('dropdownMenu').classList.contains('show')).toBe(true);
            expect(document.querySelector('.menu-button').getAttribute('aria-expanded')).toBe('true');
        });

        it('should close menu when open', () => {
            // Сначала открываем меню
            component.toggleMenu();
            // Затем закрываем
            component.toggleMenu();
            expect(document.getElementById('dropdownMenu').classList.contains('show')).toBe(false);
            expect(document.querySelector('.menu-button').getAttribute('aria-expanded')).toBe('false');
        });
    });

    describe('handleMenuItemClick', () => {
        it('should handle menu item click correctly', async () => {
            const page = 'rules';
            mockServices.navigation.openPage.mockResolvedValue(true);

            await component.handleMenuItemClick(page);

            expect(mockServices.security.sanitizeData).toHaveBeenCalledWith(page);
            expect(mockServices.navigation.openPage).toHaveBeenCalledWith(page);
            expect(mockEventBus.emit).toHaveBeenCalledWith('menu:item-clicked', page);
            expect(document.getElementById('dropdownMenu').classList.contains('show')).toBe(false);
        });

        it('should handle navigation errors', async () => {
            const page = 'rules';
            mockServices.navigation.openPage.mockRejectedValue(new Error('Navigation failed'));

            await component.handleMenuItemClick(page);

            expect(mockServices.navigation.openPage).toHaveBeenCalledWith(page);
        });
    });

    describe('menu item management', () => {
        it('should add menu item correctly', () => {
            const item = {
                page: 'test',
                icon: '🔍',
                text: 'Test Item'
            };

            component.addMenuItem(item);

            const addedItem = document.querySelector('[data-page="test"]');
            expect(addedItem).toBeTruthy();
            expect(addedItem.textContent).toContain('Test Item');
        });

        it('should remove menu item correctly', () => {
            const page = 'rules';
            component.removeMenuItem(page);
            expect(document.querySelector(`[data-page="${page}"]`)).toBeNull();
        });
    });

    describe('accessibility', () => {
        it('should set accessibility state correctly', () => {
            component.setAccessibility(false);
            expect(document.querySelector('.menu-button').getAttribute('aria-disabled')).toBe('true');
            expect(document.getElementById('dropdownMenu').getAttribute('aria-hidden')).toBe('true');
        });
    });

    describe('animation', () => {
        it('should set animation state correctly', () => {
            component.setAnimation(true);
            expect(document.getElementById('dropdownMenu').classList.contains('animated')).toBe(true);
        });
    });
}); 