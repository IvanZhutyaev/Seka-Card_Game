-- Создание основных таблиц

-- Таблица игроков
CREATE TABLE IF NOT EXISTS players (
    id BIGINT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(64),
    last_name VARCHAR(64),
    username VARCHAR(32),
    balance INTEGER DEFAULT 1000,
    rating INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица игр
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    status VARCHAR(16) NOT NULL CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
    bank INTEGER DEFAULT 0,
    winner_id BIGINT REFERENCES players(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

-- Таблица игроков в игре
CREATE TABLE IF NOT EXISTS game_players (
    game_id INTEGER REFERENCES games(id),
    player_id BIGINT REFERENCES players(id),
    cards JSONB,
    bet INTEGER DEFAULT 0,
    is_folded BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, player_id)
);

-- Таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES players(id),
    game_id INTEGER REFERENCES games(id),
    amount INTEGER NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('bet', 'win', 'refund')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 