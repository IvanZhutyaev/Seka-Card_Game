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

## WebSocket Events

### Client to Server

#### `user:init`
Инициализация пользователя при подключении.

```typescript
interface UserInitData {
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}
```

#### `game:join`
Присоединение к игре.

```typescript
interface GameJoinData {
  gameId: string;
  userId: number;
}
```

#### `game:action`
Выполнение игрового действия.

```typescript
interface GameActionData {
  gameId: string;
  userId: number;
  action: 'play' | 'pass' | 'take';
  cardId?: string;
}
```

#### `chat:message`
Отправка сообщения в чат.

```typescript
interface ChatMessageData {
  gameId: string;
  userId: number;
  text: string;
}
```

### Server to Client

#### `user:initialized`
Подтверждение инициализации пользователя.

```typescript
interface UserInitializedResponse {
  success: boolean;
  error?: string;
}
```

#### `game:state`
Обновление состояния игры.

```typescript
interface GameState {
  gameId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  currentPlayer: number;
  deck: Card[];
  table: Card[];
  lastAction?: GameAction;
}

interface Player {
  userId: number;
  username: string;
  cards: Card[];
  score: number;
}

interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
}

interface GameAction {
  type: 'play' | 'pass' | 'take';
  playerId: number;
  cardId?: string;
  timestamp: number;
}
```

#### `chat:message`
Получение сообщения чата.

```typescript
interface ChatMessage {
  gameId: string;
  userId: number;
  username: string;
  text: string;
  timestamp: number;
}
```

#### `error`
Ошибка сервера.

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}
```

## HTTP Endpoints

### GET /api/games
Получение списка доступных игр.

```typescript
interface GameListResponse {
  games: {
    id: string;
    name: string;
    players: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'finished';
  }[];
}
```

### POST /api/games
Создание новой игры.

```typescript
interface CreateGameRequest {
  name: string;
  maxPlayers: number;
  rules: GameRules;
}

interface GameRules {
  deckSize: number;
  startingCards: number;
  winCondition: 'points' | 'cards';
  maxPoints?: number;
}

interface CreateGameResponse {
  gameId: string;
  success: boolean;
  error?: string;
}
```

### GET /api/games/:id
Получение информации об игре.

```typescript
interface GameInfoResponse {
  id: string;
  name: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  rules: GameRules;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}
```

### GET /api/users/:id
Получение информации о пользователе.

```typescript
interface UserInfoResponse {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  gamesPlayed: number;
  gamesWon: number;
  rating: number;
}
```

## Error Codes

- `INVALID_USER_DATA`: Неверные данные пользователя
- `GAME_NOT_FOUND`: Игра не найдена
- `GAME_FULL`: Игра заполнена
- `INVALID_ACTION`: Неверное игровое действие
- `NOT_YOUR_TURN`: Не ваш ход
- `INVALID_CARD`: Неверная карта
- `SERVER_ERROR`: Внутренняя ошибка сервера

## Rate Limiting

- WebSocket соединения: 100 подключений в минуту
- HTTP запросы: 100 запросов в 15 минут
- Игровые действия: 10 действий в минуту
- Сообщения чата: 20 сообщений в минуту 