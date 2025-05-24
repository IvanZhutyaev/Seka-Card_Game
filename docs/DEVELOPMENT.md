# Руководство по разработке Seka Card Game

## Настройка окружения разработки

### 1. Требования

- Python 3.8+
- Git
- PostgreSQL
- Redis
- IDE (рекомендуется PyCharm или VS Code)

### 2. Настройка IDE

#### PyCharm
1. Откройте проект
2. Настройте интерпретатор Python:
   - File -> Settings -> Project -> Python Interpreter
   - Добавьте виртуальное окружение проекта

#### VS Code
1. Установите расширения:
   - Python
   - Pylance
   - Python Test Explorer
   - GitLens

2. Настройте отладку:
   - Создайте launch.json
   - Настройте точки останова

## Структура проекта

```
seka-card-game/
├── game/              # Игровая логика
│   ├── __init__.py
│   ├── engine.py      # Игровой движок
│   ├── matchmaking.py # Система подбора игроков
│   └── models.py      # Модели данных
├── server/            # Серверная часть
│   ├── __init__.py
│   ├── main.py        # Основной сервер
│   ├── routes.py      # API маршруты
│   └── websocket.py   # WebSocket обработчики
├── static/            # Статические файлы
│   ├── css/
│   ├── js/
│   └── images/
├── templates/         # HTML шаблоны
├── tests/            # Тесты
├── docs/             # Документация
└── scripts/          # Скрипты
```

## Стиль кода

### 1. Python

- Следуйте PEP 8
- Используйте type hints
- Документируйте функции и классы
- Используйте docstrings

Пример:
```python
from typing import List, Optional

def calculate_score(cards: List[Card], bonus: Optional[int] = None) -> int:
    """
    Рассчитывает очки игрока.

    Args:
        cards: Список карт игрока
        bonus: Дополнительные очки (опционально)

    Returns:
        int: Общее количество очков
    """
    score = sum(card.value for card in cards)
    if bonus:
        score += bonus
    return score
```

### 2. JavaScript

- Используйте ESLint
- Следуйте Airbnb Style Guide
- Используйте JSDoc

Пример:
```javascript
/**
 * Рассчитывает очки игрока
 * @param {Card[]} cards - Список карт игрока
 * @param {number} [bonus] - Дополнительные очки
 * @returns {number} Общее количество очков
 */
function calculateScore(cards, bonus = 0) {
    return cards.reduce((sum, card) => sum + card.value, 0) + bonus;
}
```

## Работа с Git

### 1. Ветки

- `main` - основная ветка
- `develop` - ветка разработки
- `feature/*` - новые функции
- `bugfix/*` - исправления ошибок
- `hotfix/*` - срочные исправления

### 2. Коммиты

Используйте conventional commits:
- `feat:` - новая функция
- `fix:` - исправление ошибки
- `docs:` - изменения в документации
- `style:` - форматирование кода
- `refactor:` - рефакторинг
- `test:` - добавление тестов
- `chore:` - обновление зависимостей

### 3. Pull Requests

1. Создайте ветку для новой функции
2. Напишите тесты
3. Обновите документацию
4. Создайте Pull Request
5. Пройдите код-ревью

## Тестирование

### 1. Модульные тесты

```python
# tests/test_game.py
import pytest
from game.engine import Game

def test_game_initialization():
    game = Game()
    assert game.players == []
    assert game.current_player is None

def test_add_player():
    game = Game()
    player = game.add_player("player1")
    assert player.id == "player1"
    assert len(game.players) == 1
```

### 2. Интеграционные тесты

```python
# tests/integration/test_game_flow.py
import pytest
from game.engine import Game
from game.matchmaking import MatchMaker

async def test_game_flow():
    matchmaker = MatchMaker()
    game = await matchmaker.create_game(["player1", "player2"])
    assert game.is_active
    assert len(game.players) == 2
```

### 3. E2E тесты

```python
# tests/e2e/test_game_session.py
import pytest
from server.main import app
from fastapi.testclient import TestClient

def test_game_session():
    client = TestClient(app)
    response = client.post("/api/game/start", json={"players": ["player1", "player2"]})
    assert response.status_code == 200
    game_id = response.json()["game_id"]
    
    response = client.get(f"/api/game/{game_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "active"
```

## Документация

### 1. Код

- Используйте docstrings
- Комментируйте сложные алгоритмы
- Объясняйте неочевидные решения

### 2. API

- Документируйте все эндпоинты
- Указывайте параметры и ответы
- Приводите примеры запросов

### 3. README

- Описывайте установку
- Объясняйте конфигурацию
- Приводите примеры использования

## Отладка

### 1. Логирование

```python
import logging

logger = logging.getLogger(__name__)

def process_game_action(action):
    logger.info(f"Processing action: {action}")
    try:
        result = game_engine.process(action)
        logger.debug(f"Action result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error processing action: {e}")
        raise
```

### 2. Отладка в IDE

- Используйте точки останова
- Следите за переменными
- Анализируйте стек вызовов

### 3. Профилирование

```python
import cProfile
import pstats

def profile_game():
    profiler = cProfile.Profile()
    profiler.enable()
    game.play()
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats()
```

## Оптимизация

### 1. Производительность

- Используйте кэширование
- Оптимизируйте запросы к БД
- Минимизируйте сетевые запросы

### 2. Память

- Следите за утечками
- Используйте генераторы
- Очищайте неиспользуемые ресурсы

### 3. Сеть

- Используйте WebSocket
- Сжимайте данные
- Оптимизируйте payload

## Безопасность

### 1. Аутентификация

- Используйте JWT
- Хешируйте пароли
- Проверяйте токены

### 2. Авторизация

- Проверяйте права доступа
- Используйте роли
- Валидируйте входные данные

### 3. Защита данных

- Шифруйте敏感数据
- Используйте HTTPS
- Защищайте от XSS и CSRF

## Дополнительная информация

- [Документация по API](API.md)
- [Руководство по установке](INSTALLATION.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по тестированию](TESTING.md) 