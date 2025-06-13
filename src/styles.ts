import { createGlobalStyle } from 'styled-components';
import styled from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    background-color: #1a1a1a;
    color: white;
  }
`;

export const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  gap: 20px;
`;

export const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
`;

export const OpponentArea = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  min-height: 150px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

export const TableCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
`;

export const PlayerArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 200px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;

  .cards {
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    align-items: center;

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.fold-btn {
        background-color: #ff4444;
        color: white;
      }

      &.bet-btn {
        background-color: #4CAF50;
        color: white;
      }
    }

    input {
      padding: 10px;
      border: none;
      border-radius: 4px;
      width: 100px;
      text-align: center;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
`; 