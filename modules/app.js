import { CONFIG } from './config.js';
import { Utils } from './utils.js';
// Сервисы
import { StorageService } from './services/storage.service.js';
import { ImageService } from './services/image.service.js';
import { ProfileService } from './services/profile.service.js';
import { NavigationService } from './services/navigation.service.js';
import { SecurityService } from './services/security.service.js';
// Компоненты
import { ProfileComponent } from './components/profile.component.js';
import { MenuComponent } from './components/menu.component.js';
import { SettingsComponent } from './components/settings.component.js';
import { HelpComponent } from './components/help.component.js';
import { NotificationsComponent } from './components/notifications.component.js';
import { LeaderboardComponent } from './components/leaderboard.component.js';
import { ChatComponent } from './components/chat.component.js';
import { GameComponent } from './components/game.component.js';
import { ErrorComponent } from './components/error.component.js';
import { LoadingComponent } from './components/loading.component.js';
import { EmptyComponent } from './components/empty.component.js';
import { ConfirmComponent } from './components/confirm.component.js';
import { ModalComponent } from './components/modal.component.js';

// Простейшая событийная шина
class EventBus {
    constructor() {
        this.events = {};
    }
    on(event, handler) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(handler);
    }
    off(event, handler) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(h => h !== handler);
    }
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(handler => handler(data));
    }
}

export class App {
    constructor() {
        // DI: создаём сервисы один раз
        this.services = {
            config: CONFIG,
            utils: Utils,
            storage: new StorageService(),
            image: new ImageService(),
            profile: new ProfileService(),
            navigation: new NavigationService(),
            security: new SecurityService()
        };
        // Событийная шина
        this.eventBus = new EventBus();
        // DI: создаём компоненты, передаём сервисы и eventBus
        this.components = {
            profile: new ProfileComponent(this.services, this.eventBus),
            menu: new MenuComponent(this.services, this.eventBus),
            settings: new SettingsComponent(this.services, this.eventBus),
            help: new HelpComponent(this.services, this.eventBus),
            notifications: new NotificationsComponent(this.services, this.eventBus),
            leaderboard: new LeaderboardComponent(this.services, this.eventBus),
            chat: new ChatComponent(this.services, this.eventBus),
            game: new GameComponent(this.services, this.eventBus),
            error: new ErrorComponent(this.services, this.eventBus),
            loading: new LoadingComponent(this.services, this.eventBus),
            empty: new EmptyComponent(this.services, this.eventBus),
            confirm: new ConfirmComponent(this.services, this.eventBus),
            modal: new ModalComponent(this.services, this.eventBus)
        };
    }

    async init() {
        // Инициализация сервисов (если нужно)
        this.services.security.init?.();
        // Инициализация компонентов (только нужные на странице)
        for (const key in this.components) {
            if (typeof this.components[key].init === 'function') {
                await this.components[key].init();
            }
        }
        // Пример подписки на событие
        // this.eventBus.on('profile:updated', (user) => { ... });
    }
} 