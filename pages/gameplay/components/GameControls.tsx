import React, { useState } from 'react';
import './GameControls.css';

interface GameControlsProps {
    onBet: (amount: number) => void;
    onFold: () => void;
    minBet: number;
    maxBet: number;
}

const GameControls: React.FC<GameControlsProps> = ({
    onBet,
    onFold,
    minBet,
    maxBet
}) => {
    const [betAmount, setBetAmount] = useState(minBet);

    const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            setBetAmount(Math.min(Math.max(value, minBet), maxBet));
        }
    };

    const handleBetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onBet(betAmount);
    };

    return (
        <div className="game-controls">
            <form onSubmit={handleBetSubmit} className="bet-controls">
                <div className="bet-input-group">
                    <label htmlFor="bet-amount">Ставка:</label>
                    <input
                        id="bet-amount"
                        type="number"
                        min={minBet}
                        max={maxBet}
                        value={betAmount}
                        onChange={handleBetChange}
                    />
                    <span className="bet-range">
                        {minBet} - {maxBet} 💰
                    </span>
                </div>
                
                <div className="bet-buttons">
                    <button type="submit" className="bet-button">
                        Сделать ставку
                    </button>
                    <button
                        type="button"
                        className="fold-button"
                        onClick={onFold}
                    >
                        Сбросить карты
                    </button>
                </div>
            </form>

            <div className="quick-bets">
                <button onClick={() => setBetAmount(minBet)}>
                    Мин ({minBet})
                </button>
                <button onClick={() => setBetAmount(Math.floor((minBet + maxBet) / 2))}>
                    Средняя ({Math.floor((minBet + maxBet) / 2)})
                </button>
                <button onClick={() => setBetAmount(maxBet)}>
                    Макс ({maxBet})
                </button>
            </div>
        </div>
    );
};

export default GameControls; 