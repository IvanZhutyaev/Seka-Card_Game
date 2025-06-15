import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  width: 80px;
  height: 120px;
  background: ${props => props.isJoker 
    ? 'linear-gradient(45deg, #ffd700, #ffa500)'
    : 'white'};
  border-radius: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: ${props => 
    props.suit === 'hearts' || props.suit === 'diamonds' 
      ? 'red' 
      : 'black'};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  position: relative;
  transition: transform 0.2s;
  border: ${props => props.isJoker ? '2px solid #ffd700' : 'none'};
  
  &:hover {
    transform: translateY(-5px);
  }
  
  &::after {
    content: ${props => props.isJoker ? '"Джокер"' : 'none'};
    position: absolute;
    bottom: 5px;
    font-size: 12px;
    color: #000;
  }
`;

const Card = ({ rank, suit, isJoker }) => {
  const cardText = isJoker ? '9♣*' : rank;
  
  return (
    <CardContainer 
      suit={suit} 
      isJoker={isJoker}
    >
      {cardText}
    </CardContainer>
  );
};

export default Card; 