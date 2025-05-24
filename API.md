# API Documentation

## Components API

### ProfileComponent

```javascript
class ProfileComponent {
    constructor(services, eventBus) {}
    
    async init() {}
    async updateProfile(user) {}
    async updateSettings(settings) {}
    show() {}
    hide() {}
}
```

#### Methods

- `init()`: Инициализация компонента
- `updateProfile(user)`: Обновление профиля пользователя
- `updateSettings(settings)`: Обновление настроек
- `show()`: Показать компонент
- `hide()`: Скрыть компонент

### MenuComponent

```javascript
class MenuComponent {
    constructor(services, eventBus) {}
    
    init() {}
    toggleMenu() {}
    async handleMenuItemClick(page) {}
    addMenuItem(item) {}
    removeMenuItem(page) {}
    setAccessibility(enabled) {}
    setAnimation(enabled) {}
}
```

#### Methods

- `init()`: Инициализация компонента
- `toggleMenu()`: Переключение состояния меню
- `handleMenuItemClick(page)`: Обработка клика по пункту меню
- `addMenuItem(item)`: Добавление пункта меню
- `removeMenuItem(page)`: Удаление пункта меню
- `setAccessibility(enabled)`: Управление доступностью
- `setAnimation(enabled)`: Управление анимацией

## Services API

### ProfileService

```javascript
class ProfileService {
    constructor() {}
    
    async loadProfile() {}
    async updateProfile(user) {}
    async updateStats(stats) {}
    async updateSettings(settings) {}
}
```

#### Methods

- `loadProfile()`: Загрузка профиля
- `updateProfile(user)`: Обновление профиля
- `updateStats(stats)`: Обновление статистики
- `updateSettings(settings)`: Обновление настроек

### NavigationService

```javascript
class NavigationService {
    constructor() {}
    
    async openPage(page) {}
    handleClickOutside(event) {}
}
```

#### Methods

- `openPage(page)`: Открытие страницы
- `handleClickOutside(event)`: Обработка клика вне элемента

### SecurityService

```javascript
class SecurityService {
    constructor() {}
    
    sanitizeData(data) {}
    async validateFile(file) {}
}
```

#### Methods

- `sanitizeData(data)`: Санитизация данных
- `validateFile(file)`: Валидация файла

### StorageService

```javascript
class StorageService {
    constructor() {}
    
    getUserData() {}
    setUserData(data) {}
    clearUserData() {}
}
```

#### Methods

- `getUserData()`: Получение данных пользователя
- `setUserData(data)`: Сохранение данных пользователя
- `clearUserData()`: Очистка данных пользователя

## Events

### Profile Events

- `profile:updated` - Профиль обновлен
- `profile:settings-updated` - Настройки обновлены
- `profile:stats-updated` - Статистика обновлена

### Menu Events

- `menu:item-clicked` - Клик по пункту меню
- `menu:toggled` - Меню переключено

### Navigation Events

- `navigation:page-changed` - Страница изменена
- `navigation:back` - Возврат назад

## Error Handling

Все методы сервисов и компонентов возвращают Promise и могут выбрасывать ошибки. Обработка ошибок должна быть реализована на уровне компонентов.

```javascript
try {
    await component.updateProfile(user);
} catch (error) {
    console.error('Error updating profile:', error);
    // Обработка ошибки
}
```

## Best Practices

1. Всегда используйте async/await для асинхронных операций
2. Обрабатывайте ошибки на уровне компонентов
3. Используйте типизацию данных
4. Следуйте принципам SOLID
5. Пишите тесты для всех публичных методов 