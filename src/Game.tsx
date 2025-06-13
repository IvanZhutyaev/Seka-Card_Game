import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import Card from './Card.tsx'; // Update import to .tsx
import { GameContainer, PlayerArea, TableCenter, OpponentArea, UserInfo as UserInfoStyle } from './styles';
import { Player, Card as CardType, UserInfo as UserInfoType } from './types'; // Import types

interface GameProps {
  userData: UserInfoType;
}

interface GameState {
  bank: number;
  currentBet: number;
  isMyTurn: boolean;
  playerCards: CardType[];
  opponentCards: CardType[];
  gameId: string | null;
}

const Game: React.FC<GameProps> = ({ userData }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    bank: 0,
    currentBet: 0,
    isMyTurn: false,
    playerCards: [],
    opponentCards: [],
    gameId: null
  });

  // WebSocket подключение
  useEffect(() => {
    if (userData?.id) {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        console.error('Ошибка: initData не найдены!');
        return;
      }
      
      const encodedInitData = encodeURIComponent(initData);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/${userData.id}?initData=${encodedInitData}`);
      
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
            const message = data.winner === userData.id ? 'Вы победили!' : 'Вы проиграли!';
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.showAlert(message);
            } else {
              alert(message);
            }
            setTimeout(() => socket.send(JSON.stringify({ type: 'find_game' })), 3000);
            break;
          case 'error':
            if (window.Telegram?.WebApp) {
              window.Telegram.WebApp.showAlert(data.message);
            } else {
              alert(data.message);
            }
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
    
    const betAmountInput = document.getElementById('bet-amount') as HTMLInputElement | null;
    if (!betAmountInput) return; 

    const amount = parseInt(betAmountInput.value);
    if (isNaN(amount) || amount < 100 || amount > 2000) {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Некорректная сумма ставки');
      } else {
        alert('Некорректная сумма ставки');
      }
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
        <UserInfoStyle>
          {userData.photo_url && <img src={userData.photo_url} alt="avatar" />}
          <span>{userData.first_name}</span>
        </UserInfoStyle>
      )}

      <OpponentArea>
        {gameState.opponentCards.map((card, index) => (
          <Card key={index} card={card} isHidden={true} /> 
        ))}
      </OpponentArea>

      <TableCenter>
        <div>Банк: {gameState.bank}₽</div>
        <div>Текущая ставка: {gameState.currentBet}₽</div>
      </TableCenter>

      <PlayerArea>
        <div className="cards">
          {gameState.playerCards.map((card, index) => (
            <Card key={index} card={card} isHidden={false} /> 
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