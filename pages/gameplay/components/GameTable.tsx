import React, { useEffect } from 'react';
import { useGameState } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import './GameTable.css';

const GameTable: React.FC = () => {
    const { connect, initTelegramUser, gameState, exitGame } = useGameState();
    
    useEffect(() => {
        // Инициализируем данные Telegram пользователя
        const user = initTelegramUser();
        if (user) {
            console.log('Telegram user initialized:', user);
        }
        
        // Подключаемся к WebSocket
        connect();
    }, [connect, initTelegramUser]);
    
    return (
        <div className="table-container">
            <div className="header">
                <button className="menu-button" onClick={() => {/* TODO: Добавить меню */}} />
                <button className="sound-button" onClick={() => {/* TODO: Добавить звук */}} />
                <button className="exit-button" onClick={exitGame} />
                <div className="player-queue-info">
                    {gameState.status === 'waiting' ? 'Поиск игры...' : 'Игра идет'}
                </div>
            </div>
            <div className="poker-table">
                <div className="table-logo">СЕКА</div>
                <div className="bank">Банк: {gameState.bank}</div>
                
                {/* Рендерим игроков */}
                {Object.entries(gameState.players).map(([playerId, player]) => (
                    <PlayerHand key={playerId} playerId={playerId} />
                ))}
                
                {/* Панель управления */}
                <div className="controls-panel">
                    <div className="chips-select">
                        <button className="chip-btn selected">100</button>
                        <button className="chip-btn">200</button>
                        <button className="chip-btn">500</button>
                        <button className="chip-btn">1000</button>
                    </div>
                    <input type="range" min="100" max="2000" value="500" className="bet-slider" />
                    <div className="action-btns">
                        <button className="action-btn">Ставка</button>
                        <button className="action-btn fold">Пас</button>
                        <button className="action-btn">Чек</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameTable; 