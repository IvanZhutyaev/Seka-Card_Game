import { Utils } from '../utils.js';

export class MenuComponent {
    constructor(services, eventBus) {
        this.services = services;
        this.eventBus = eventBus;
        this.navigationService = services.navigation;
        this.securityService = services.security;
        this.elements = {
            menuButton: document.querySelector('.menu-button'),
            dropdownMenu: document.getElementById('dropdownMenu'),
            menuItems: document.querySelectorAll('.dropdown-item')
        };
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Обработка клика по кнопке меню
        this.elements.menuButton?.addEventListener('click', () => {
            this.toggleMenu();
        });

        // Обработка кликов по пунктам меню
        this.elements.menuItems?.forEach(item => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.handleMenuItemClick(page);
                }
            });
        });

        // Обработка клика вне меню
        document.addEventListener('click', this.navigationService.handleClickOutside);

        // Обработка клавиатуры
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (!this.elements.dropdownMenu || !this.elements.menuButton) return;

        const isExpanded = this.elements.dropdownMenu.classList.contains('show');
        
        if (isExpanded) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (!this.elements.dropdownMenu || !this.elements.menuButton) return;

        this.elements.dropdownMenu.classList.add('show');
        this.elements.menuButton.setAttribute('aria-expanded', 'true');
        TelegramUtils.hapticFeedback('light');
    }

    closeMenu() {
        if (!this.elements.dropdownMenu || !this.elements.menuButton) return;

        this.elements.dropdownMenu.classList.remove('show');
        this.elements.menuButton.setAttribute('aria-expanded', 'false');
    }

    async handleMenuItemClick(page) {
        try {
            const sanitizedPage = this.securityService.sanitizeData(page);
            await this.navigationService.openPage(sanitizedPage);
            this.closeMenu();
            this.eventBus?.emit('menu:item-clicked', sanitizedPage);
        } catch (error) {
            console.error('Error handling menu item click:', error);
        }
    }

    // Методы для работы с состоянием меню
    isOpen() {
        return this.elements.dropdownMenu?.classList.contains('show') ?? false;
    }

    // Методы для работы с пунктами меню
    addMenuItem(item) {
        if (!this.elements.dropdownMenu) return;

        const sanitizedItem = this.securityService.sanitizeData(item);
        const menuItem = this.createMenuItem(sanitizedItem);
        this.elements.dropdownMenu.appendChild(menuItem);
    }

    removeMenuItem(page) {
        const item = this.elements.dropdownMenu?.querySelector(`[data-page="${page}"]`);
        if (item) {
            item.remove();
        }
    }

    createMenuItem(item) {
        const { page, icon, text } = item;
        const element = document.createElement('a');
        element.href = '#';
        element.className = 'dropdown-item';
        element.setAttribute('data-page', page);
        element.setAttribute('role', 'menuitem');

        const iconSpan = document.createElement('span');
        iconSpan.className = 'dropdown-icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = icon;

        element.appendChild(iconSpan);
        element.appendChild(document.createTextNode(text));

        element.addEventListener('click', (event) => {
            event.preventDefault();
            this.handleMenuItemClick(page);
        });

        return element;
    }

    // Методы для работы с доступностью
    setAccessibility(accessible) {
        if (!this.elements.menuButton || !this.elements.dropdownMenu) return;

        this.elements.menuButton.setAttribute('aria-disabled', !accessible);
        this.elements.dropdownMenu.setAttribute('aria-hidden', !accessible);

        this.elements.menuItems?.forEach(item => {
            item.setAttribute('aria-disabled', !accessible);
        });
    }

    // Методы для работы с анимацией
    setAnimation(enabled) {
        if (!this.elements.dropdownMenu) return;

        if (enabled) {
            this.elements.dropdownMenu.classList.add('animated');
        } else {
            this.elements.dropdownMenu.classList.remove('animated');
        }
    }

    // Очистка
    cleanup() {
        // Удаляем обработчики событий
        this.elements.menuButton?.removeEventListener('click', this.toggleMenu);
        this.elements.menuItems?.forEach(item => {
            item.removeEventListener('click', this.handleMenuItemClick);
        });
        document.removeEventListener('click', this.navigationService.handleClickOutside);
    }
} 