import React, { useEffect, useState } from 'react';
import { useGameState } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import Avatar from './Avatar';
import './GameTable.css';
import GameControls from './GameControls';

const GameTable: React.FC = () => {
    const { 
        connect, 
        initTelegramUser, 
        gameState, 
        exitGame,
        telegramUser,
        isConnected,
        makeAction,
        cancelMatchmaking,
        handleError
    } = useGameState();
    
    const [selectedChip, setSelectedChip] = useState<number>(100);
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
    
    useEffect(() => {
        // Логируем инициализацию компонента
        console.info('GameTable component mounted');

        // Инициализируем Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
        
        // Инициализируем данные Telegram пользователя
        const user = initTelegramUser();
        if (user) {
            console.info('Telegram user initialized', user);
        } else {
            console.error('Failed to initialize Telegram user');
            handleError('Не удалось инициализировать пользователя');
        }
        
        // Подключаемся к WebSocket
        console.info('Attempting to connect to WebSocket');
        connect();
        
        // Очистка при размонтировании
        return () => {
            console.info('GameTable component unmounting');
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
            }
        };
    }, [connect, initTelegramUser, handleError]);
    
    // Логируем изменения состояния подключения
    useEffect(() => {
        console.info('WebSocket connection state changed:', { isConnected });
    }, [isConnected]);

    // Логируем изменения состояния игры
    useEffect(() => {
        console.info('Game state updated:', {
            status: gameState.status,
            playersCount: Object.keys(gameState.players).length,
            currentTurn: gameState.current_turn,
            bank: gameState.bank
        });
    }, [gameState]);

    // Обработка ошибок
    useEffect(() => {
        if (gameState.status === 'error' && gameState.error) {
            console.error('Game error:', gameState.error);
        }
    }, [gameState.status, gameState.error]);

    // Обработка переподключения
    useEffect(() => {
        if (gameState.status === 'reconnecting') {
            console.log('Attempting to reconnect...', gameState.reconnectAttempts);
        }
    }, [gameState.status, gameState.reconnectAttempts]);

    const handleSoundToggle = () => {
        setIsSoundEnabled(!isSoundEnabled);
        // TODO: Добавить звуковые эффекты
    };
    
    const handleChipSelect = (value: number) => {
        setSelectedChip(value);
    };

    const handleBet = () => {
        makeAction({
            type: 'game_action',
            action: 'bet',
            amount: selectedChip,
            timestamp: Date.now()
        });
    };

    const handleFold = () => {
        makeAction({
            type: 'game_action',
            action: 'fold',
            timestamp: Date.now()
        });
    };

    const handleCheck = () => {
        makeAction({
            type: 'game_action',
            action: 'check',
            timestamp: Date.now()
        });
    };
    
    // Логируем ошибки рендеринга
    const handleError = (error: Error) => {
        console.error('Render error in GameTable:', error);
    };

    if (!telegramUser) {
        return (
            <div className="game-loading">
                <div className="loader" />
                <p>Загрузка данных пользователя...</p>
            </div>
        );
    }

    if (gameState.status === 'error') {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h2>Произошла ошибка</h2>
                    <p>{gameState.error}</p>
                    <button onClick={() => window.location.reload()}>
                        Обновить страницу
                    </button>
                </div>
            </div>
        );
    }

    if (gameState.status === 'reconnecting') {
        return (
            <div className="game-loading">
                <div className="loader" />
                <p>Переподключение к серверу... ({gameState.reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            <div className="header">
                <button className="menu-button" onClick={() => {/* TODO: Добавить меню */}} />
                <button 
                    className={`sound-button ${isSoundEnabled ? 'enabled' : 'disabled'}`} 
                    onClick={handleSoundToggle} 
                />
                <button className="exit-button" onClick={exitGame} />
                <div className="player-queue-info">
                    {!isConnected ? 'Подключение...' : 
                     gameState.status === 'waiting' ? (
                        <div className="matchmaking-info">
                            <div className="matchmaking-status">
                                Поиск игры... ({gameState.matchmaking.playersCount}/{gameState.matchmaking.requiredPlayers})
                            </div>
                            <div className="matchmaking-bets">
                                Ставки: {gameState.matchmaking.minBet} - {gameState.matchmaking.maxBet}
                            </div>
                            {gameState.matchmaking.isSearching && (
                                <button 
                                    className="cancel-search-button"
                                    onClick={cancelMatchmaking}
                                >
                                    Отменить поиск
                                </button>
                            )}
                        </div>
                     ) : 'Игра идет'}
                </div>
            </div>
            
            <div className="poker-table">
                <div className="table-logo">СЕКА</div>
                <div className="bank">Банк: {gameState.bank}</div>
                
                {/* Рендерим игроков в правильном порядке */}
                <div className="players-grid">
                    {/* Верхний ряд (3 игрока) */}
                    <div className="top-players">
                        {Object.entries(gameState.players).slice(0, 3).map(([playerId, player]) => (
                            <div key={playerId} className="player-container">
                                {player.user && <Avatar user={player.user} size="medium" />}
                                <PlayerHand playerId={playerId} />
                            </div>
                        ))}
                    </div>
                    
                    {/* Центральная область с банком */}
                    <div className="table-center">
                        <div className="bank-info">
                            <span>Банк: {gameState.bank}</span>
                            <span>Текущая ставка: {gameState.currentBet}</span>
                        </div>
                    </div>
                    
                    {/* Нижний ряд (3 игрока) */}
                    <div className="bottom-players">
                        {Object.entries(gameState.players).slice(3, 6).map(([playerId, player]) => (
                            <div key={playerId} className="player-container">
                                {player.user && <Avatar user={player.user} size="medium" />}
                                <PlayerHand playerId={playerId} />
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Панель управления */}
                <div className="controls-panel">
                    <div className="chips-select">
                        {[100, 200, 500, 1000].map(value => (
                            <button 
                                key={value}
                                className={`chip-btn ${selectedChip === value ? 'selected' : ''}`}
                                onClick={() => handleChipSelect(value)}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    <input 
                        type="range" 
                        min="100" 
                        max="2000" 
                        value={selectedChip}
                        onChange={(e) => handleChipSelect(Number(e.target.value))}
                        className="bet-slider" 
                    />
                    <div className="action-btns">
                        <button 
                            className="action-btn bet"
                            onClick={handleBet}
                            disabled={gameState.status !== 'playing' || gameState.current_turn !== telegramUser?.id.toString()}
                        >
                            Ставка
                        </button>
                        <button 
                            className="action-btn fold"
                            onClick={handleFold}
                            disabled={gameState.status !== 'playing' || gameState.current_turn !== telegramUser?.id.toString()}
                        >
                            Пас
                        </button>
                        <button 
                            className="action-btn check"
                            onClick={handleCheck}
                            disabled={gameState.status !== 'playing' || gameState.current_turn !== telegramUser?.id.toString()}
                        >
                            Чек
                        </button>
                    </div>
                </div>
            </div>
            <GameControls />
        </div>
    );
};

export default GameTable; 