import React from 'react';
import styled from 'styled-components';
import { Card as CardType } from '../types'; // Import CardType from types.ts

interface CardContainerProps {
  suit?: string;
  isHidden?: boolean;
}

const CardContainer = styled.div<CardContainerProps>`
  width: 100px;
  height: 140px;
  background-color: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
  color: ${props => props.suit === '♥' || props.suit === '♦' ? 'red' : 'black'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: ${props => props.isHidden ? 'rotateY(180deg)' : 'none'};
  transition: transform 0.3s ease;

  .top, .bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .bottom {
    transform: rotate(180deg);
  }

  .value {
    font-size: 24px;
    font-weight: bold;
  }

  .suit {
    font-size: 32px;
  }
`;

interface CardProps {
  card: CardType; // Use the imported CardType
  isHidden?: boolean;
}

const Card: React.FC<CardProps> = ({ card, isHidden = false }) => {
  if (isHidden) {
    return (
      <CardContainer isHidden={isHidden}>
        <div className="back">
          <div className="pattern"></div>
        </div>
      </CardContainer>
    );
  }

  return (
    <CardContainer suit={card.suit}>
      <div className="top">
        <div className="value">{card.rank}</div>
        <div className="suit">{card.suit}</div>
      </div>
      <div className="bottom">
        <div className="value">{card.rank}</div>
        <div className="suit">{card.suit}</div>
      </div>
    </CardContainer>
  );
};

export default Card; 