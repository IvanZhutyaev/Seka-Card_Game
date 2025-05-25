import React, { useEffect, useState } from 'react';
import { useGameState } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import Avatar from './Avatar';
import './GameTable.css';

const GameTable: React.FC = () => {
    const { 
        connect, 
        initTelegramUser, 
        gameState, 
        exitGame,
        telegramUser,
        isConnected,
        makeAction
    } = useGameState();
    
    const [selectedChip, setSelectedChip] = useState<number>(100);
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
    
    useEffect(() => {
        // Инициализируем Telegram WebApp
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
        
        // Инициализируем данные Telegram пользователя
        const user = initTelegramUser();
        if (user) {
            console.log('Telegram user initialized:', user);
        }
        
        // Подключаемся к WebSocket
        connect();
        
        // Очистка при размонтировании
        return () => {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.close();
            }
        };
    }, [connect, initTelegramUser]);
    
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
            amount: selectedChip
        });
    };

    const handleFold = () => {
        makeAction({
            type: 'game_action',
            action: 'fold'
        });
    };

    const handleCheck = () => {
        makeAction({
            type: 'game_action',
            action: 'check'
        });
    };
    
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
                     gameState.status === 'waiting' ? 'Поиск игры...' : 'Игра идет'}
                </div>
            </div>
            
            <div className="poker-table">
                <div className="table-logo">СЕКА</div>
                <div className="bank">Банк: {gameState.bank}</div>
                
                {/* Рендерим игроков */}
                {Object.entries(gameState.players).map(([playerId, player]) => (
                    <div key={playerId} className="player-container">
                        {player.user && <Avatar user={player.user} size="medium" />}
                        <PlayerHand playerId={playerId} />
                    </div>
                ))}
                
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
        </div>
    );
};

export default GameTable; 