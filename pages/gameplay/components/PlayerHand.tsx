import React from 'react';
import { useGameState } from '../store/gameStore';
import Avatar from './Avatar';
import './PlayerHand.css';

interface PlayerHandProps {
    playerId: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ playerId }) => {
    const { gameState, telegramUser } = useGameState();
    const player = gameState.players[playerId];
    
    if (!player) return null;

    const isCurrentPlayer = playerId === telegramUser?.id.toString();
    const isActive = playerId === gameState.current_turn;
    const isFolded = player.status === 'folded';
    
    return (
        <div 
            className={`player-hand ${isActive ? 'active' : ''} ${isFolded ? 'folded' : ''} ${isCurrentPlayer ? 'self' : ''}`}
        >
            <div className="player-info">
                <div className="player-details">
                    <div className="player-identity">
                        {player.user_info && <Avatar user={player.user_info} size="small" />}
                        <span className="player-name">
                            {player.user_info?.first_name || 'Игрок'}
                            {isCurrentPlayer && <span className="player-tag">Вы</span>}
                        </span>
                    </div>
                    <div className="player-stats">
                        <span className="player-balance">{player.balance} 💰</span>
                        {player.bet > 0 && (
                            <span className="player-bet">Ставка: {player.bet} 💰</span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="cards-container">
                {player.cards.map((card, index) => (
                    <div 
                        key={index}
                        className={`card ${isActive ? 'active' : 'inactive'} ${card.suit === '♥' || card.suit === '♦' ? 'red' : 'black'}`}
                        style={{
                            '--card-index': index,
                            '--card-delay': `${index * 0.1}s`
                        } as React.CSSProperties}
                    >
                        <span className="rank">{card.rank}</span>
                        <span className="suit">{card.suit}</span>
                    </div>
                ))}
            </div>
            
            {player.lastAction && (
                <div className="last-action">
                    {player.lastAction === 'bet' && 
                        `Ставка: ${player.bet}`}
                    {player.lastAction === 'fold' && 'Пас'}
                    {player.lastAction === 'check' && 'Чек'}
                </div>
            )}

            {isFolded && (
                <div className="folded-indicator">
                    Сбросил карты
                </div>
            )}
        </div>
    );
};

export default PlayerHand; 