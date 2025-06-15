import React from 'react';
import styled from 'styled-components';
import { Card as CardType } from '../types';

interface CardProps {
  card?: CardType;
  isHidden?: boolean;
}

const CardContainer = styled.div<{ isRed?: boolean; isHidden?: boolean }>`
  width: 60px;
  height: 90px;
  background: ${props => props.isHidden ? 
    'linear-gradient(135deg, #1a237e, #3949ab)' : 
    'white'};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${props => props.isHidden ? 
    'transparent' : 
    props.isRed ? '#d32f2f' : '#212121'};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
  cursor: default;
  user-select: none;

  &:hover {
    transform: translateY(-5px);
  }
`;

const Rank = styled.div`
  font-size: 24px;
  font-weight: bold;
`;

const Suit = styled.div`
  font-size: 32px;
  line-height: 1;
`;

const Card: React.FC<CardProps> = ({ card, isHidden = false }) => {
  if (!card) return null;

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <CardContainer isRed={isRed} isHidden={isHidden}>
      {!isHidden && (
        <>
          <Rank>{card.rank}</Rank>
          <Suit>{card.suit}</Suit>
        </>
      )}
    </CardContainer>
  );
};

export default Card; 