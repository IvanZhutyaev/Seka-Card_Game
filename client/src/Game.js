import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useGameStore from './store/gameStore';
import styled from 'styled-components';

// #region Styles
const GameWrapper = styled.div`
  padding: 20px;
  background-color: #0a1a2a;
  color: #e0e0e0;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
`;

const PlayerList = styled.ul`
  list-style: none;
  padding: 0;
`;

const PlayerListItem = styled.li`
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin-bottom: 5px;
  font-weight: ${props => props.isTurn ? 'bold' : 'normal'};
  color: ${props => props.isTurn ? '#4285f4' : '#e0e0e0'};
`;

const StartButton = styled.button`
    background-color: #4285F4;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 20px;
    
    &:hover {
        background-color: #357ae8;
    }

    &:disabled {
        background-color: #555;
        cursor: not-allowed;
    }
`;
// #endregion

const Game = () => {
  const { gameId } = useParams();
  const { gameState, joinGame, startGame } = useGameStore((state) => ({
    gameState: state.gameState,
    joinGame: state.joinGame,
    startGame: state.startGame,
  }));
  
  // A mock username. In a real app, this would come from user authentication.
  const username = `Player_${Math.random().toString(36).substr(2, 5)}`;

  useEffect(() => {
    // A one-time effect to join the game when the component mounts
    if (gameId) {
      joinGame(gameId, username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, username]); // `joinGame` is stable and doesn't need to be a dependency

  const handleStartGame = () => {
    if (gameId) {
        startGame(gameId);
    }
  };

  if (!gameState) {
    return <GameWrapper>Loading game...</GameWrapper>;
  }

  const canStart = gameState.players.length >= 2 && gameState.state === 'waiting';

  return (
    <GameWrapper>
      <h1>Игровое лобби: {gameId}</h1>
      <h2>Статус: {gameState.state}</h2>
      <h3>Игроки:</h3>
      <PlayerList>
        {gameState.players.map((player) => (
          <PlayerListItem key={player.id} isTurn={player.id === gameState.turn}>
            {player.username}
          </PlayerListItem>
        ))}
      </PlayerList>
      
      {gameState.state === 'waiting' && (
        <StartButton onClick={handleStartGame} disabled={!canStart}>
            Начать игру ({gameState.players.length}/2)
        </StartButton>
      )}

      {/* The full game UI will be built out here */}
    </GameWrapper>
  );
};

export default Game;