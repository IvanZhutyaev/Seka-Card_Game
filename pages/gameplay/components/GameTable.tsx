import React, { useEffect, useState } from 'react';
import { Card } from '../types/game';
import { useGameState } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import GameControls from './GameControls';
import './GameTable.css';

const GameTable: React.FC = () => {
    const { 
        gameState,
        playerId,
        connect,
        disconnect,
        placeBet,
        fold
    } = useGameState();

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, []);

    const handleBet = (amount: number) => {
        placeBet(amount);
    };

    const handleFold = () => {
        fold();
    };

    if (!isConnected) {
        return (
            <div className="game-loading">
                <h2>Подключение к игре...</h2>
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div className="game-table">
            <div className="game-info">
                <div className="bank">
                    <h3>Банк</h3>
                    <p>{gameState.bank} 💰</p>
                </div>
                <div className="status">
                    <h3>Статус</h3>
                    <p>{gameState.status}</p>
                </div>
            </div>

            <div className="players-container">
                {Object.entries(gameState.players).map(([id, player]) => (
                    <PlayerHand
                        key={id}
                        playerId={id}
                        isCurrentPlayer={id === playerId}
                        hand={player.hand}
                        bet={player.bet}
                        isFolded={player.folded}
                    />
                ))}
            </div>

            {gameState.current_turn === playerId && (
                <GameControls
                    onBet={handleBet}
                    onFold={handleFold}
                    minBet={100}
                    maxBet={1000}
                />
            )}
        </div>
    );
}

export default GameTable; 