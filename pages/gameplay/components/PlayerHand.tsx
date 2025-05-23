import React from 'react';
import { useGameState } from '../store/gameStore';

interface PlayerHandProps {
    playerId: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ playerId }) => {
    const { gameState, telegramUser } = useGameState();
    const player = gameState.players[playerId];
    
    if (!player) return null;
    
    const isCurrentPlayer = playerId === gameState.current_turn;
    const playerName = telegramUser?.first_name || 'Игрок';
    const playerPhoto = telegramUser?.photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(playerName);
    
    return (
        <div className={`player ${isCurrentPlayer ? 'active' : ''}`}>
            <div className="avatar" style={{ backgroundImage: `url(${playerPhoto})` }} />
            <div className="player-name">{playerName}</div>
            <div className="player-balance">{player.bet}</div>
            <div className="player-status">
                {isCurrentPlayer ? 'Ваш ход' : player.folded ? 'Пас' : ''}
            </div>
            <div className="player-cards">
                {player.hand?.cards.map((card, index) => (
                    <div key={index} className={`card ${player.folded ? '' : 'open'}`}>
                        {card.str}
                    </div>
                ))}
            </div>
            {player.bet > 0 && (
                <div className="chips">
                    {Array(Math.ceil(player.bet / 100)).fill(0).map((_, i) => (
                        <div key={i} className="chip" />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlayerHand; 