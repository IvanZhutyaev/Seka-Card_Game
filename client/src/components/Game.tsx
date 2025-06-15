import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import useGameStore from '../store/gameStore';
import PlayerHand from './PlayerHand';

// Simple logger utility
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
};

const GameContainer = styled.div`
  min-height: 100vh;
  background: #0a1a3a;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, #1a3a6a 0%, #0a1a3a 100%);
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
`;

const GameTable = styled.div`
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  flex: 1;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  gap: 20px;
`;

const OpponentsArea = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  justify-items: center;
  align-items: center;
`;

const TableCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const PlayerArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const GameInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 20px;
`;

const BetControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => 
    props.variant === 'danger' ? '#d32f2f' :
    props.variant === 'primary' ? '#4CAF50' :
    '#757575'};
  color: white;

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BetInput = styled.input`
  padding: 10px;
  border: 2px solid #4CAF50;
  border-radius: 8px;
  font-size: 16px;
  width: 120px;
  background: rgba(255, 255, 255, 0.1);
  color: white;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const WaitingMessage = styled.div`
  font-size: 32px;
  text-align: center;
  margin: 40px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.05);
  padding: 40px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 600px;
  width: 90%;
`;

const LoadingDots = styled.div`
  display: inline-block;
  position: relative;
  width: 80px;
  height: 20px;
  
  &::after {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #4CAF50;
    border-radius: 50%;
    animation: dots 1.5s infinite;
    box-shadow: 20px 0 0 0 #4CAF50, 40px 0 0 0 #4CAF50;
  }

  @keyframes dots {
    0% { transform: translateX(0); }
    50% { transform: translateX(10px); }
    100% { transform: translateX(0); }
  }
`;

const StatusInfo = styled.div`
  font-size: 18px;
  color: #8f9bba;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`;

const PlayerCounter = styled.div`
  font-size: 24px;
  color: #4CAF50;
  font-weight: bold;
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  
  span {
    background: rgba(76, 175, 80, 0.1);
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(76, 175, 80, 0.2);
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #d32f2f;
  color: white;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #b71c1c;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  color: #f44336;
  padding: 16px;
  border-radius: 8px;
  margin: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RetryButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #f44336;
  color: white;
  font-size: 16px;
  cursor: pointer;
  margin: 0 auto;
  transition: all 0.2s;

  &:hover {
    background: #d32f2f;
  }
`;

const Game: React.FC = () => {
  const { gameState, playerId, placeBet, fold, cancelWaiting } = useGameStore();
  const [betAmount, setBetAmount] = useState<number>(100);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  useEffect(() => {
    const initGame = async () => {
      try {
        if (window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
          if (user) {
        useGameStore.getState().setPlayerId(String(user.id));
        logger.info('Telegram WebApp initialized successfully', {
          user,
          initData: window.Telegram.WebApp.initData
        });

            try {
              // Validate initData on server
          useGameStore.getState().connect();
        } catch (error) {
          logger.error('Error validating init data', error);
          setConnectionError(true);
            }
          }
        }
      } catch (error) {
        logger.error('Error initializing Telegram WebApp', error);
        setConnectionError(true);
      }
    };

    initGame();
  }, []);

  if (connectionError) {
    return (
      <GameContainer>
        <ContentWrapper>
          <ErrorMessage>
            Ошибка подключения. Пожалуйста, попробуйте позже.
          </ErrorMessage>
        </ContentWrapper>
      </GameContainer>
    );
  }

  if (!gameState) {
    return (
      <GameContainer>
        <ContentWrapper>
            <LoadingDots />
        </ContentWrapper>
      </GameContainer>
    );
  }

  if (gameState.status === 'waiting' || gameState.status === 'matchmaking') {
    return (
      <GameContainer>
        <ContentWrapper>
          <WaitingMessage>
            Ожидание игроков...
            <LoadingDots />
            <PlayerCounter>
              <span>{Object.keys(gameState.players).length}/6</span>
              игроков в лобби
            </PlayerCounter>
            <StatusInfo>
              <span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M7 7h2v5H7V7zm0-3h2v2H7V4z" fill="#4CAF50"/>
                </svg>
                Минимальная ставка: {gameState.min_bet} монет
              </span>
              <span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14A6 6 0 118 2a6 6 0 010 12z" fill="#FFC107"/>
                </svg>
                Максимальная ставка: {gameState.max_bet} монет
              </span>
            </StatusInfo>
            <CancelButton onClick={cancelWaiting}>
              Отменить ожидание
            </CancelButton>
          </WaitingMessage>
        </ContentWrapper>
      </GameContainer>
    );
  }

  const currentPlayer = playerId ? gameState.players[playerId] : null;
  const isCurrentTurn = gameState.current_turn === playerId;
  const isBettingPhase = gameState.status === 'betting';
  const isPlayingPhase = gameState.status === 'playing';

  const handleBet = () => {
    if (betAmount >= gameState.min_bet && betAmount <= gameState.max_bet) {
      placeBet(betAmount);
    }
  };

  const otherPlayers = Object.entries(gameState.players)
    .filter(([id]) => id !== playerId);

  return (
    <GameContainer>
      <GameTable>
        <OpponentsArea>
          {otherPlayers.map(([id, player]) => (
            <PlayerHand
              key={id}
              player={player}
              playerId={id}
              isCurrentPlayer={gameState.current_turn === id}
              isSelf={false}
              isFolded={gameState.folded_players.includes(id)}
            />
          ))}
        </OpponentsArea>

        <TableCenter>
          <GameInfo>
            <div>Банк: {gameState.bank}</div>
            <div>Текущая ставка: {gameState.currentBet}</div>
          </GameInfo>
        </TableCenter>

        <PlayerArea>
          {currentPlayer && (
            <>
              <PlayerHand
                player={currentPlayer}
                playerId={playerId!}
                isCurrentPlayer={isCurrentTurn}
                isSelf={true}
                isFolded={gameState.folded_players.includes(playerId!)}
              />

              {isCurrentTurn && (isPlayingPhase || isBettingPhase) && (
                <BetControls>
                  <BetInput
                    type="number"
                    min={gameState.min_bet}
                    max={gameState.max_bet}
                    step={100}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                  />
                  <Button
                    variant="primary"
                    onClick={handleBet}
                    disabled={!isCurrentTurn}
                  >
                    Ставка
                  </Button>
                  <Button
                    variant="danger"
                    onClick={fold}
                    disabled={!isCurrentTurn || isBettingPhase}
                  >
                    Пас
                  </Button>
                </BetControls>
              )}
            </>
          )}
        </PlayerArea>
      </GameTable>
    </GameContainer>
  );
};

export default Game; 