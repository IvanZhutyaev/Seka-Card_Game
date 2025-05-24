# Руководство по тестированию Seka Card Game

## Настройка окружения для тестирования

### 1. Установка зависимостей

```bash
pip install -r requirements-dev.txt
```

### 2. Настройка тестовой базы данных

```bash
# Создание тестовой базы данных
createdb seka_game_test

# Применение миграций
python scripts/init_test_db.py
```

## Типы тестов

### 1. Модульные тесты

Тестирование отдельных компонентов и функций.

```python
# tests/unit/test_card.py
import pytest
from game.models import Card

def test_card_creation():
    card = Card(suit="hearts", value=10)
    assert card.suit == "hearts"
    assert card.value == 10

def test_card_comparison():
    card1 = Card(suit="hearts", value=10)
    card2 = Card(suit="hearts", value=11)
    assert card1 < card2
```

### 2. Интеграционные тесты

Тестирование взаимодействия компонентов.

```python
# tests/integration/test_game_flow.py
import pytest
from game.engine import Game
from game.matchmaking import MatchMaker

async def test_game_creation():
    matchmaker = MatchMaker()
    game = await matchmaker.create_game(["player1", "player2"])
    assert game.is_active
    assert len(game.players) == 2

async def test_game_round():
    game = Game()
    game.add_player("player1")
    game.add_player("player2")
    game.start_round()
    assert game.current_round is not None
    assert game.current_player is not None
```

### 3. E2E тесты

Тестирование полного цикла работы приложения.

```python
# tests/e2e/test_game_session.py
import pytest
from fastapi.testclient import TestClient
from server.main import app

def test_game_session():
    client = TestClient(app)
    
    # Создание игры
    response = client.post("/api/game/start", json={
        "players": ["player1", "player2"]
    })
    assert response.status_code == 200
    game_id = response.json()["game_id"]
    
    # Проверка статуса игры
    response = client.get(f"/api/game/{game_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "active"
    
    # Выполнение хода
    response = client.post(f"/api/game/{game_id}/action", json={
        "player": "player1",
        "action": "play_card",
        "card": {"suit": "hearts", "value": 10}
    })
    assert response.status_code == 200
```

### 4. Нагрузочные тесты

Тестирование производительности под нагрузкой.

```python
# tests/load/test_performance.py
import asyncio
import pytest
from locust import HttpUser, task, between

class GameUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def play_game(self):
        # Создание игры
        self.client.post("/api/game/start", json={
            "players": ["player1", "player2"]
        })
        
        # Выполнение ходов
        for _ in range(10):
            self.client.post("/api/game/action", json={
                "player": "player1",
                "action": "play_card",
                "card": {"suit": "hearts", "value": 10}
            })
```

## Запуск тестов

### 1. Запуск всех тестов

```bash
pytest
```

### 2. Запуск конкретного типа тестов

```bash
# Модульные тесты
pytest tests/unit/

# Интеграционные тесты
pytest tests/integration/

# E2E тесты
pytest tests/e2e/

# Нагрузочные тесты
locust -f tests/load/test_performance.py
```

### 3. Запуск с отчетом о покрытии

```bash
pytest --cov=game --cov-report=html
```

## Написание тестов

### 1. Фикстуры

```python
# tests/conftest.py
import pytest
from game.engine import Game
from game.models import Player

@pytest.fixture
def game():
    return Game()

@pytest.fixture
def player():
    return Player(id="test_player", name="Test Player")

@pytest.fixture
def game_with_players(game, player):
    game.add_player(player)
    return game
```

### 2. Параметризованные тесты

```python
# tests/test_card.py
import pytest
from game.models import Card

@pytest.mark.parametrize("suit,value,expected", [
    ("hearts", 10, True),
    ("spades", 11, True),
    ("invalid", 10, False),
    ("hearts", 15, False),
])
def test_card_validation(suit, value, expected):
    try:
        card = Card(suit=suit, value=value)
        assert expected
    except ValueError:
        assert not expected
```

### 3. Моки и стабы

```python
# tests/test_matchmaking.py
import pytest
from unittest.mock import Mock, patch
from game.matchmaking import MatchMaker

def test_matchmaking_with_mock():
    with patch('game.matchmaking.Redis') as mock_redis:
        mock_redis.return_value.get.return_value = None
        matchmaker = MatchMaker()
        result = matchmaker.find_match(1000)
        assert result is None
```

## CI/CD

### 1. GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.8'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements-dev.txt
      - name: Run tests
        run: |
          pytest --cov=game --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### 2. Локальный CI

```bash
# scripts/run_tests.sh
#!/bin/bash

# Запуск линтеров
flake8 game tests
black --check game tests

# Запуск тестов
pytest --cov=game --cov-report=html

# Проверка покрытия
coverage report --fail-under=80
```

## Отчеты о тестировании

### 1. HTML отчет

```bash
pytest --cov=game --cov-report=html
# Отчет будет доступен в htmlcov/index.html
```

### 2. XML отчет

```bash
pytest --cov=game --cov-report=xml
# Отчет будет сохранен в coverage.xml
```

### 3. Консольный отчет

```bash
pytest -v --cov=game
```

## Дополнительная информация

- [Документация по API](API.md)
- [Руководство по установке](INSTALLATION.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по разработке](DEVELOPMENT.md) 