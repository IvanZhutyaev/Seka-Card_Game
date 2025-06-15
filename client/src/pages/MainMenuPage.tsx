import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';

// #region Styled Components
const MainMenuWrapper = styled.div`
  background-color: #0a1a2a;
  color: #e0e0e0;
  padding: 16px;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
`;

const ProfileTopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const ProfileHeader = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  cursor: pointer;
`;

const AvatarContainer = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid white;
  overflow: hidden;
  background-color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Balance = styled.div`
  font-size: 24px;
  font-weight: 700;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
`;

const TitleSection = styled.div`
  margin: 20px 0 10px 0;
  text-align: left;
`;

const Title = styled.h1`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const Divider = styled.div`
  height: 2px;
  background-color: #4285f4;
  width: 100%;
  border-radius: 2px;
  margin-bottom: 20px;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 25%;
  min-width: 120px;
  max-width: 200px;
  margin-left: 16px;
`;

const ImageButton = styled.button`
  width: 100%;
  aspect-ratio: 1 / 1;
  background-image: url('/static/LobbySekaCard.jpeg'); /* Placeholder */
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);

  &:hover::after {
    background: rgba(0, 0, 0, 0.1);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    transition: all 0.3s;
  }
`;

const ButtonLabel = styled.div`
  text-align: center;
  margin-top: 8px;
  font-size: 18px;
  font-weight: 500;
`;
// #endregion

// Mock data
const mockUser = {
  avatarUrl: null, // or a URL to an image
  balance: 1250,
};

const MainMenuPage = () => {
  const navigate = useNavigate();
  const [user] = useState(mockUser);
  const createGame = useGameStore((state) => state.createGame);
  const gameState = useGameStore((state) => state.gameState);

  // Hide BackButton on the main menu
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.BackButton.hide();
    }
  }, []);

  // Navigate to game lobby when game is created/joined
  useEffect(() => {
    if (gameState?.id) {
      navigate(`/game/${gameState.id}`);
    }
  }, [gameState, navigate]);

  const handlePlayClick = () => {
    // For now, we'll just create a new game.
    // In a real app, you'd have a lobby, a way to enter a game ID, etc.
    createGame();
  };

  return (
    <MainMenuWrapper>
      <ProfileTopBar>
        <ProfileHeader onClick={() => navigate('/profile')}>
          <AvatarContainer>
            {user.avatarUrl ? (
              <Avatar src={user.avatarUrl} alt="User Avatar" />
            ) : (
              <div className="default-avatar">👤</div>
            )}
          </AvatarContainer>
          <Balance>${user.balance}</Balance>
        </ProfileHeader>
        {/* Dropdown menu can be added here */}
      </ProfileTopBar>

      <TitleSection>
        <Title>Выберите режим</Title>
        <Divider />
      </TitleSection>

      <ButtonContainer>
        <ImageButton onClick={handlePlayClick} />
        <ButtonLabel>Играть</ButtonLabel>
      </ButtonContainer>
    </MainMenuWrapper>
  );
};

export default MainMenuPage; 