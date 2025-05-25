import React from 'react';
import { useGameState } from '../store/gameStore';
import './PlayerHand.css';

interface PlayerHandProps {
    playerId: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ playerId }) => {
    const { gameState } = useGameState();
    const player = gameState.players[playerId];
    
    if (!player) return null;
    
    return (
        <div className="player-hand">
            <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-balance">{player.balance}</span>
            </div>
            
            <div className="cards-container">
                {player.cards.map((card, index) => (
                    <div 
                        key={index}
                        className={`card ${player.isActive ? 'active' : 'inactive'}`}
                        style={{
                            '--card-index': index,
                            '--card-delay': `${index * 0.1}s`
                        } as React.CSSProperties}
                    >
                        {card}
                    </div>
                ))}
            </div>
            
            {gameState.lastAction?.playerId === playerId && (
                <div className="last-action">
                    {gameState.lastAction.type === 'bet' && 
                        `Ставка: ${gameState.lastAction.amount}`}
                    {gameState.lastAction.type === 'fold' && 'Пас'}
                    {gameState.lastAction.type === 'check' && 'Чек'}
                </div>
            )}
        </div>
    );
};

export default PlayerHand; 