# API Documentation Seka Card Game

## Authentication

All API endpoints require authentication using an API key. Include the API key in the request header:

```
Authorization: Bearer your-api-key-here
```

## Endpoints

### Game Management

#### Create Game
```http
POST /api/game/start
```

Request body:
```json
{
    "players": ["player1", "player2"]
}
```

Response:
```json
{
    "game_id": "uuid",
    "status": "active",
    "players": ["player1", "player2"],
    "current_player": "player1"
}
```

#### Get Game Status
```http
GET /api/game/{game_id}
```

Response:
```json
{
    "game_id": "uuid",
    "status": "active",
    "players": ["player1", "player2"],
    "current_player": "player1",
    "round": 1,
    "scores": {
        "player1": 0,
        "player2": 0
    }
}
```

#### Make Move
```http
POST /api/game/{game_id}/action
```

Request body:
```json
{
    "player": "player1",
    "action": "play_card",
    "card": {
        "suit": "hearts",
        "value": 10
    }
}
```

Response:
```json
{
    "status": "success",
    "next_player": "player2",
    "round_complete": false
}
```

### Player Management

#### Register Player
```http
POST /api/players/register
```

Request body:
```json
{
    "username": "player1",
    "password": "secure_password"
}
```

Response:
```json
{
    "player_id": "uuid",
    "username": "player1",
    "token": "jwt_token"
}
```

#### Login
```http
POST /api/players/login
```

Request body:
```json
{
    "username": "player1",
    "password": "secure_password"
}
```

Response:
```json
{
    "player_id": "uuid",
    "username": "player1",
    "token": "jwt_token"
}
```

### Matchmaking

#### Find Match
```http
POST /api/matchmaking/find
```

Request body:
```json
{
    "player_id": "uuid",
    "preferences": {
        "max_wait_time": 30,
        "skill_level": "intermediate"
    }
}
```

Response:
```json
{
    "match_id": "uuid",
    "status": "searching",
    "estimated_wait_time": 15
}
```

#### Cancel Match Search
```http
POST /api/matchmaking/cancel
```

Request body:
```json
{
    "match_id": "uuid"
}
```

Response:
```json
{
    "status": "cancelled"
}
```

### Statistics

#### Get Player Stats
```http
GET /api/stats/player/{player_id}
```

Response:
```json
{
    "player_id": "uuid",
    "username": "player1",
    "games_played": 100,
    "games_won": 60,
    "win_rate": 0.6,
    "average_score": 25.5,
    "rank": 5
}
```

#### Get Leaderboard
```http
GET /api/stats/leaderboard
```

Query parameters:
- `limit`: Number of players to return (default: 10)
- `offset`: Number of players to skip (default: 0)
- `timeframe`: Time period for stats (day/week/month/all)

Response:
```json
{
    "total": 1000,
    "players": [
        {
            "player_id": "uuid",
            "username": "player1",
            "score": 1000,
            "rank": 1
        },
        // ...
    ]
}
```

### WebSocket Events

Connect to WebSocket endpoint:
```
ws://your-domain.com/ws
```

#### Game Events

```json
{
    "type": "game_start",
    "data": {
        "game_id": "uuid",
        "players": ["player1", "player2"]
    }
}
```

```json
{
    "type": "card_played",
    "data": {
        "player": "player1",
        "card": {
            "suit": "hearts",
            "value": 10
        }
    }
}
```

```json
{
    "type": "round_end",
    "data": {
        "round": 1,
        "winner": "player1",
        "scores": {
            "player1": 10,
            "player2": 5
        }
    }
}
```

```json
{
    "type": "game_end",
    "data": {
        "winner": "player1",
        "final_scores": {
            "player1": 100,
            "player2": 80
        }
    }
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable error message"
    }
}
```

Common error codes:
- `INVALID_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Missing or invalid API key
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `GAME_IN_PROGRESS`: Game is already in progress
- `INVALID_MOVE`: Invalid game move
- `PLAYER_NOT_FOUND`: Player not found
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Versioning

API versioning is handled through the URL path:
```
/api/v1/game/start
```

Current supported versions:
- v1 (default)

## Additional Information

- [Руководство по установке](INSTALLATION.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Руководство по разработке](DEVELOPMENT.md)
- [Руководство по тестированию](TESTING.md) 