import React, { useState } from 'react';
import { useGameState } from '../store/gameStore';
import './GameControls.css';

const GameControls: React.FC = () => {
    const { gameState, telegramUser, makeAction } = useGameState();
    const [selectedChip, setSelectedChip] = useState<number>(100);

    // Проверяем, может ли игрок сделать действие
    const canAct = gameState.status === 'playing' && 
                  gameState.current_turn === telegramUser?.id.toString();

    // Обработчики действий
    const handleBet = () => {
        if (!canAct) return;
        
        makeAction({
            type: 'game_action',
            action: 'bet',
            amount: selectedChip,
            timestamp: Date.now()
        });
    };

    const handleFold = () => {
        if (!canAct) return;
        
        makeAction({
            type: 'game_action',
            action: 'fold',
            timestamp: Date.now()
        });
    };

    const handleCheck = () => {
        if (!canAct) return;
        
        makeAction({
            type: 'game_action',
            action: 'check',
            timestamp: Date.now()
        });
    };

    // Обработчик изменения ставки
    const handleChipSelect = (value: number) => {
        setSelectedChip(Math.min(Math.max(value, gameState.matchmaking.minBet), gameState.matchmaking.maxBet));
    };

    // Быстрые ставки
    const quickBets = [
        { label: 'Мин', value: gameState.matchmaking.minBet },
        { label: 'Средняя', value: Math.floor((gameState.matchmaking.minBet + gameState.matchmaking.maxBet) / 2) },
        { label: 'Макс', value: gameState.matchmaking.maxBet }
    ];

    return (
        <div className="game-controls">
            <div className="bet-controls">
                <div className="bet-input-group">
                    <label htmlFor="bet-amount">Ставка:</label>
                    <input
                        id="bet-amount"
                        type="number"
                        min={gameState.matchmaking.minBet}
                        max={gameState.matchmaking.maxBet}
                        value={selectedChip}
                        onChange={(e) => handleChipSelect(Number(e.target.value))}
                        disabled={!canAct}
                    />
                    <span className="bet-range">
                        {gameState.matchmaking.minBet} - {gameState.matchmaking.maxBet} 💰
                    </span>
                </div>
                
                <div className="bet-buttons">
                    <button 
                        className="bet-button"
                        onClick={handleBet}
                        disabled={!canAct}
                    >
                        Сделать ставку
                    </button>
                    <button
                        className="fold-button"
                        onClick={handleFold}
                        disabled={!canAct}
                    >
                        Сбросить карты
                    </button>
                    <button
                        className="check-button"
                        onClick={handleCheck}
                        disabled={!canAct}
                    >
                        Чек
                    </button>
                </div>
            </div>

            <div className="quick-bets">
                {quickBets.map(({ label, value }) => (
                    <button
                        key={label}
                        onClick={() => handleChipSelect(value)}
                        disabled={!canAct}
                    >
                        {label} ({value})
                    </button>
                ))}
            </div>
        </div>
    );
};

export default GameControls; 