import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useGameStore } from '../store/gameStore';
import PlayerHand from './PlayerHand';
import { logger } from '../utils/logger';

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
  const { 
    gameState, 
    playerId,
    isConnected,
    connect,
    disconnect,
    placeBet,
    fold,
    cancelWaiting
  } = useGameStore();

  const [betAmount, setBetAmount] = useState(100);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    const initTelegramApp = async () => {
      if (!window.Telegram?.WebApp) {
        logger.error('Telegram WebApp is not available');
        setConnectionError(true);
        return;
      }

      try {
        // Инициализируем Telegram WebApp
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();

        // Получаем данные пользователя
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (!user?.id) {
          logger.error('User ID is not available');
          setConnectionError(true);
          return;
        }

        // Устанавливаем ID для логгера и игрока
        logger.setUserId(String(user.id));
        useGameStore.getState().setPlayerId(String(user.id));

        logger.info('Telegram WebApp initialized successfully', {
          user,
          initData: window.Telegram.WebApp.initData
        });

        // Проверяем валидность initData на сервере
        try {
          const response = await fetch('/api/validate-init-data', {
            method: 'POST',
            headers: {
              'Telegram-Web-App-Init-Data': window.Telegram.WebApp.initData
            }
          });

          if (!response.ok) {
            throw new Error('Failed to validate init data');
          }

          const data = await response.json();
          if (!data.valid) {
            throw new Error('Invalid init data');
          }

          logger.info('Init data validated successfully');
          
          // Подключаемся к игре только после успешной валидации
          useGameStore.getState().connect();
        } catch (error) {
          logger.error('Error validating init data', error);
          setConnectionError(true);
        }
      } catch (error) {
        logger.error('Error initializing Telegram WebApp', error);
        setConnectionError(true);
      }
    };

    initTelegramApp();

    return () => {
      useGameStore.getState().disconnect();
    };
  }, []);

  // Следим за состоянием подключения
  useEffect(() => {
    if (!isConnected) {
      setConnectionError(true);
    } else {
      setConnectionError(false);
      setReconnectAttempts(0);
    }
  }, [isConnected]);

  const handleRetryConnection = () => {
    setReconnectAttempts(prev => prev + 1);
    connect();
  };

  const handleCancelWaiting = async () => {
    setIsCanceling(true);
    try {
      await cancelWaiting();
    } finally {
      setIsCanceling(false);
    }
  };

  if (connectionError && reconnectAttempts >= 5) {
    return (
      <GameContainer>
        <ContentWrapper>
          <ErrorMessage>
            <div>Не удалось подключиться к серверу</div>
            <div>Пожалуйста, проверьте подключение к интернету</div>
            <RetryButton onClick={handleRetryConnection}>
              Попробовать снова
            </RetryButton>
          </ErrorMessage>
        </ContentWrapper>
      </GameContainer>
    );
  }

  if (!isConnected) {
    return (
      <GameContainer>
        <ContentWrapper>
          <WaitingMessage>
            <h2>Подключение к серверу</h2>
            <LoadingDots />
            <StatusInfo>
              <span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#4CAF50"/>
                  <path d="M7 7h2v5H7V7zm0-3h2v2H7V4z" fill="#4CAF50"/>
                </svg>
                Пожалуйста, подождите
              </span>
            </StatusInfo>
          </WaitingMessage>
        </ContentWrapper>
      </GameContainer>
    );
  }

  if (gameState.status === 'waiting' || gameState.status === 'matchmaking') {
    return (
      <GameContainer>
        <ContentWrapper>
          <WaitingMessage>
            <h2>Ожидание игроков</h2>
            <LoadingDots />
            <PlayerCounter>
              <span>{Object.keys(gameState.players).length}/6</span>
              игроков в лобби
            </PlayerCounter>
            <StatusInfo>
              <span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#4CAF50"/>
                  <path d="M7 7h2v5H7V7zm0-3h2v2H7V4z" fill="#4CAF50"/>
                </svg>
                Минимальная ставка: {gameState.min_bet} монет
              </span>
              <span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#4CAF50"/>
                  <path d="M9 4H7v5l4.3 2.6 1-1.7L9 8V4z" fill="#4CAF50"/>
                </svg>
                Ожидаем подключения игроков
              </span>
            </StatusInfo>
            <CancelButton 
              onClick={handleCancelWaiting}
              disabled={isCanceling}
              style={{ opacity: isCanceling ? 0.7 : 1 }}
            >
              {isCanceling ? (
                <LoadingDots style={{ width: 24, height: 24 }} />
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/>
                  </svg>
                  Отменить поиск
                </>
              )}
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
    if (betAmount >= (gameState.min_bet || 100) && betAmount <= (gameState.max_bet || 2000)) {
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
            <div>Текущая ставка: {gameState.current_bet}</div>
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
                    min={gameState.min_bet || 100}
                    max={gameState.max_bet || 2000}
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