import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
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

const Card = ({ value, suit, isHidden = false }) => {
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
    <CardContainer suit={suit}>
      <div className="top">
        <div className="value">{value}</div>
        <div className="suit">{suit}</div>
      </div>
      <div className="bottom">
        <div className="value">{value}</div>
        <div className="suit">{suit}</div>
      </div>
    </CardContainer>
  );
};

export default Card; 