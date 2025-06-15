import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardUI } from './Card';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';
import { Table } from './Table';
import { Actions } from './Actions';

const Game: React.FC = () => {
  const {
    gameState,
    playerId,
    connect,
    disconnect,
    setPlayerId
  } = useGameStore();

  useEffect(() => {
    const webAppUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (webAppUser) {
      setPlayerId(String(webAppUser.id));
    }
  }, [setPlayerId]);

  useEffect(() => {
    if (playerId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [playerId, connect, disconnect]);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  const isCurrentTurn = gameState.current_turn === playerId;

  return (
    <div className="game-container">
      <OpponentHand players={gameState.players} currentPlayerId={playerId} />
      <Table bank={gameState.bank} currentBet={gameState.currentBet} />
      <PlayerHand players={gameState.players} currentPlayerId={playerId} />
      <Actions isMyTurn={isCurrentTurn} />
    </div>
  );
};

export default Game;