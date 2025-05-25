import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import Card from './Card';
import { GameContainer, PlayerArea, TableCenter, OpponentArea, UserInfo } from './styles';

const Game = () => {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState({
    bank: 0,
    currentBet: 0,
    isMyTurn: false,
    playerCards: [],
    opponentCards: [],
    gameId: null
  });
  const [userData, setUserData] = useState(null);

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      setUserData(window.Telegram.WebApp.initDataUnsafe.user);
    }
  }, []);

  // WebSocket подключение
  useEffect(() => {
    if (userData?.id) {
      const socket = new WebSocket(`ws://${window.location.host}/ws/${userData.id}`);
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        socket.send(JSON.stringify({ type: 'find_game' }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'game_state':
            setGameState(prev => ({ ...prev, ...data.state }));
            break;
          case 'game_over':
            alert(data.winner === userData.id ? 'Вы победили!' : 'Вы проиграли!');
            setTimeout(() => socket.send(JSON.stringify({ type: 'find_game' })), 3000);
            break;
          case 'error':
            alert(data.message);
            break;
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(() => setWs(null), 5000);
      };

      setWs(socket);

      return () => socket.close();
    }
  }, [userData]);

  const handleBet = useCallback(() => {
    if (!ws || !gameState.isMyTurn) return;
    
    const amount = parseInt(document.getElementById('bet-amount').value);
    if (isNaN(amount) || amount < 100 || amount > 2000) {
      alert('Некорректная сумма ставки');
      return;
    }

    ws.send(JSON.stringify({
      type: 'game_action',
      game_id: gameState.gameId,
      action: 'bet',
      amount
    }));
  }, [ws, gameState]);

  const handleFold = useCallback(() => {
    if (!ws || !gameState.isMyTurn) return;
    
    ws.send(JSON.stringify({
      type: 'game_action',
      game_id: gameState.gameId,
      action: 'fold'
    }));
  }, [ws, gameState]);

  return (
    <GameContainer>
      {userData && (
        <UserInfo>
          {userData.photo_url && <img src={userData.photo_url} alt="avatar" />}
          <span>{userData.first_name}</span>
        </UserInfo>
      )}

      <OpponentArea>
        {gameState.opponentCards.map((card, index) => (
          <Card key={index} {...card} />
        ))}
      </OpponentArea>

      <TableCenter>
        <div>Банк: {gameState.bank}₽</div>
        <div>Текущая ставка: {gameState.currentBet}₽</div>
      </TableCenter>

      <PlayerArea>
        <div className="cards">
          {gameState.playerCards.map((card, index) => (
            <Card key={index} {...card} />
          ))}
        </div>
        
        <div className="actions">
          <button 
            onClick={handleFold}
            disabled={!gameState.isMyTurn}
            className="fold-btn"
          >
            Пас
          </button>
          
          <input
            type="number"
            id="bet-amount"
            min={gameState.currentBet || 100}
            max={2000}
            disabled={!gameState.isMyTurn}
          />
          
          <button
            onClick={handleBet}
            disabled={!gameState.isMyTurn}
            className="bet-btn"
          >
            Ставка
          </button>
        </div>
      </PlayerArea>
    </GameContainer>
  );
};

export default Game; 