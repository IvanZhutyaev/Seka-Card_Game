import React from 'react';
import { Card } from '../types/game';
import './PlayerHand.css';

interface PlayerHandProps {
    playerId: string;
    isCurrentPlayer: boolean;
    hand: {
        cards: Card[];
        rank: string;
    } | null;
    bet: number;
    isFolded: boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
    playerId,
    isCurrentPlayer,
    hand,
    bet,
    isFolded
}) => {
    const renderCard = (card: Card) => {
        const color = ['♥', '♦'].includes(card.suit) ? 'red' : 'black';
        return (
            <div className={`card ${color}`} key={`${card.rank}${card.suit}`}>
                <div className="card-content">
                    <span className="rank">{card.rank}</span>
                    <span className="suit">{card.suit}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={`player-hand ${isCurrentPlayer ? 'current' : ''} ${isFolded ? 'folded' : ''}`}>
            <div className="player-info">
                <span className="player-id">Игрок {playerId}</span>
                <span className="player-bet">Ставка: {bet} 💰</span>
            </div>
            
            <div className="cards-container">
                {isFolded ? (
                    <div className="folded-text">Сбросил</div>
                ) : hand ? (
                    <>
                        <div className="cards">
                            {hand.cards.map(card => renderCard(card))}
                        </div>
                        <div className="hand-rank">
                            {hand.rank}
                        </div>
                    </>
                ) : (
                    <div className="cards-placeholder">
                        <div className="card back" />
                        <div className="card back" />
                        <div className="card back" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerHand; 