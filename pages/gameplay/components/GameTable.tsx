import React, { useEffect, useState } from 'react';
import { useGameState } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import GameControls from './GameControls';
import MatchmakingWindow from './MatchmakingWindow';
import './GameTable.css';

// Индикатор состояния подключения
const ConnectionStatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    let color = '#aaa';
    let text = 'Нет соединения';
    switch (status) {
        case 'connecting':
            color = '#f0ad4e'; text = 'Подключение...'; break;
        case 'open':
            color = '#5cb85c'; text = 'Онлайн'; break;
        case 'reconnecting':
            color = '#5bc0de'; text = 'Переподключение...'; break;
        case 'error':
            color = '#d9534f'; text = 'Ошибка соединения'; break;
        case 'closed':
        default:
            color = '#aaa'; text = 'Нет соединения'; break;
    }
    return (
        <div className="connection-status-indicator" style={{ color }}>
            <span className="dot" style={{ background: color }} />
            {text}
        </div>
    );
};

const GameTable: React.FC = () => {
    const { 
        connect, 
        initTelegramUser, 
        gameState, 
        exitGame,
        telegramUser,
        isConnected,
        handleError
    } = useGameState();
    
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
    // Таймер обратного отсчета для хода
    const [moveTimer, setMoveTimer] = useState<number>(0);
    
    // Инициализация при монтировании
    useEffect(() => {
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

    // Таймер обратного отсчета для хода
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (gameState.moveTimeoutAt && gameState.current_turn === telegramUser?.id.toString()) {
            interval = setInterval(() => {
                const left = Math.max(0, Math.floor((gameState.moveTimeoutAt! - Date.now()) / 1000));
                setMoveTimer(left);
            }, 250);
        } else {
            setMoveTimer(0);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [gameState.moveTimeoutAt, gameState.current_turn, telegramUser]);

    const handleSoundToggle = () => {
        setIsSoundEnabled(!isSoundEnabled);
        // TODO: Добавить звуковые эффекты
    };

    // Если нет данных пользователя
    if (!telegramUser) {
        return (
            <div className="game-loading">
                <div className="loader" />
                <p>Загрузка данных пользователя...</p>
            </div>
        );
    }

    // Если произошла ошибка
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

    // Если идет переподключение
    if (gameState.status === 'reconnecting') {
        return (
            <div className="game-loading">
                <div className="loader" />
                <p>Переподключение к серверу... ({gameState.reconnectAttempts}/5)</p>
            </div>
        );
    }

    // Если идет поиск игры, показываем окно матчмейкинга
    if (gameState.status === 'waiting' || gameState.status === 'matchmaking') {
        return <MatchmakingWindow />;
    }

    return (
        <div className="table-container">
            <div className="header">
                <button 
                    className={`sound-button ${isSoundEnabled ? 'enabled' : 'disabled'}`} 
                    onClick={handleSoundToggle} 
                />
                <button className="exit-button" onClick={exitGame} />
                <div className="player-queue-info">
                    {!isConnected ? 'Подключение...' : 'Игра идет'}
                </div>
                {/* Индикатор состояния подключения */}
                <ConnectionStatusIndicator status={gameState.connectionStatus} />
            </div>
            
            <div className="poker-table">
                <div className="table-logo">СЕКА</div>
                <div className="bank">Банк: {gameState.bank}</div>
                {/* Таймер хода */}
                {gameState.current_turn === telegramUser?.id.toString() && gameState.moveTimeoutAt && (
                    <div className="move-timer">
                        Ваш ход! Осталось: <span className={moveTimer <= 5 ? 'danger' : ''}>{moveTimer}</span> сек.
                    </div>
                )}
                
                {/* Рендерим игроков в правильном порядке */}
                <div className="players-grid">
                    {/* Верхний ряд (3 игрока) */}
                    <div className="top-players">
                        {Object.entries(gameState.players).slice(0, 3).map(([playerId, player]) => (
                            <div key={playerId} className={`player-container ${player.status === 'folded' ? 'folded-anim' : ''}`}>
                                <PlayerHand playerId={playerId} />
                            </div>
                        ))}
                    </div>
                    
                    {/* Центральная область с банком */}
                    <div className="table-center">
                        <div className="bank-info">
                            <span>Банк: {gameState.bank}</span>
                            <span>Текущая ставка: {gameState.minBet || 0}</span>
                        </div>
                    </div>
                    
                    {/* Нижний ряд (3 игрока) */}
                    <div className="bottom-players">
                        {Object.entries(gameState.players).slice(3, 6).map(([playerId, player]) => (
                            <div key={playerId} className={`player-container ${player.status === 'folded' ? 'folded-anim' : ''}`}>
                                <PlayerHand playerId={playerId} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Панель управления */}
            <GameControls />
        </div>
    );
};

export default GameTable; 