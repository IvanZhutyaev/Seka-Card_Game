import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    background-color: #0a1a3a;
    color: white;
    height: 100vh;
    overflow: hidden;
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  input {
    width: 100px;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
  }
`;

export const GameContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
`;

export const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  span {
    font-size: 18px;
    font-weight: bold;
  }
`;

export const OpponentArea = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
`;

export const TableCenter = styled.div`
  text-align: center;
  margin: 20px 0;
  font-size: 18px;

  div {
    margin: 5px 0;
  }
`;

export const PlayerArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  .cards {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .actions {
    display: flex;
    gap: 20px;
    align-items: center;

    .fold-btn {
      background: #f44336;
      color: white;
    }

    .bet-btn {
      background: #4CAF50;
      color: white;
    }
  }
`; 