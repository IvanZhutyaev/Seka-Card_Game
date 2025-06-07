import React from 'react';
import styled from 'styled-components';
import { Player } from '../types';
import Card from './Card';

interface PlayerHandProps {
  player: Player;
  playerId: string;
  isCurrentPlayer: boolean;
  isSelf: boolean;
  isFolded: boolean;
}

const Container = styled.div<{ isCurrentPlayer: boolean; isSelf: boolean; isFolded: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.isCurrentPlayer ? 
    'rgba(255, 255, 255, 0.2)' : 
    'rgba(0, 0, 0, 0.2)'};
  border-radius: 12px;
  backdrop-filter: blur(8px);
  min-width: 200px;
  position: relative;
  border: ${props => props.isSelf ? '2px solid #4CAF50' : 'none'};
  opacity: ${props => props.isFolded ? 0.5 : 1};
  box-shadow: ${props => props.isCurrentPlayer ? 
    '0 0 15px rgba(255, 215, 0, 0.5)' : 
    'none'};
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: white;
  font-size: 14px;
  width: 100%;
`;

const PlayerDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const PlayerName = styled.div`
  font-weight: bold;
  font-size: 16px;
`;

const BetInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #FFD700;
  font-weight: bold;
`;

const CardsContainer = styled.div`
  display: flex;
  gap: 8px;
  perspective: 1000px;
`;

const FoldedIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  background: rgba(244, 67, 54, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 16px;
  white-space: nowrap;
  z-index: 10;
`;

const PlayerHand: React.FC<PlayerHandProps> = ({
  player,
  playerId,
  isCurrentPlayer,
  isSelf,
  isFolded
}) => {
  return (
    <Container
      isCurrentPlayer={isCurrentPlayer}
      isSelf={isSelf}
      isFolded={isFolded}
    >
      <PlayerInfo>
        <PlayerDetails>
          {player.user_info?.photo_url && (
            <Avatar src={player.user_info.photo_url} alt="Player avatar" />
          )}
          <PlayerName>
            {player.user_info?.first_name || `Player ${playerId}`}
          </PlayerName>
        </PlayerDetails>
        <BetInfo>
          <span>Ставка: {player.bet}</span>
          <span>Всего: {player.total_bet}</span>
        </BetInfo>
      </PlayerInfo>

      <CardsContainer>
        {player.cards.map((card, index) => (
          <Card
            key={`${card.rank}${card.suit}`}
            card={card}
            isHidden={!isSelf && !isFolded}
          />
        ))}
      </CardsContainer>

      {isFolded && <FoldedIndicator>ПАС</FoldedIndicator>}
    </Container>
  );
};

export default PlayerHand; 