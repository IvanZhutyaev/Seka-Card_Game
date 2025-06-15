import React, { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import styled from 'styled-components';

const GameContainer = styled.div`
  color: white;
  padding: 20px;
  text-align: center;
`;

const StatusText = styled.p`
  font-size: 18px;
  margin-bottom: 20px;
`;

const Game = () => {
  const { status, connect, disconnect } = useGameStore();
  const [initData, setInitData] = useState('');

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    if (tg) {
      tg.ready();
      const data = tg.initData;
      setInitData(data);
      console.log("Raw initData:", data);

      if (data) {
        connect(data);
      } else {
        console.error("Telegram.WebApp.initData is empty.");
      }
    } else {
      console.error("Telegram.WebApp is not available.");
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <GameContainer>
      <h1>Seka Card Game</h1>
      <StatusText>Status: {status}</StatusText>
      {/* Game UI will go here */}
    </GameContainer>
  );
};

export default Game; 