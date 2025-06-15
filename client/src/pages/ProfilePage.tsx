import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

// #region Styled Components
const ProfileWrapper = styled.div`
  background-color: #0a1a2a;
  color: #e0e0e0;
  padding: 16px;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto 20px;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .page-title {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: 18px;
    font-weight: 600;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 1;
`;

const ProfileContainer = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

const ProfileSection = styled.section`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;

  h2 {
    color: #4285f4;
    margin-bottom: 15px;
    font-size: 20px;
  }
`;

const ProfileField = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;

  label {
    opacity: 0.8;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`;

const StatItem = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #4285f4;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;
// #endregion

// Mock user data - replace with actual data fetching
const mockUser = {
  username: 'TelegramUser',
  balance: 1250,
  gamesPlayed: 42,
  wins: 25,
  loses: 17,
  winRate: '60%',
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user] = useState(mockUser);

  const navigateBack = () => navigate(-1);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.BackButton.show();
      tg.BackButton.onClick(navigateBack);

      return () => {
        tg.BackButton.offClick(navigateBack);
      };
    }
  }, [navigateBack]);

  return (
    <ProfileWrapper>
      <Header>
        <BackButton onClick={navigateBack}>←</BackButton>
        <h1 className="page-title">Профиль</h1>
      </Header>
      <ProfileContainer>
        <ProfileSection>
          <h2>Основная информация</h2>
          <ProfileField>
            <label>Имя пользователя</label>
            <span>{user.username}</span>
          </ProfileField>
          <ProfileField>
            <label>Баланс</label>
            <span>${user.balance}</span>
          </ProfileField>
        </ProfileSection>

        <ProfileSection>
          <h2>Статистика</h2>
          <StatsGrid>
            <StatItem>
              <StatValue>{user.gamesPlayed}</StatValue>
              <StatLabel>Сыграно игр</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{user.wins}</StatValue>
              <StatLabel>Победы</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{user.loses}</StatValue>
              <StatLabel>Поражения</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{user.winRate}</StatValue>
              <StatLabel>Процент побед</StatLabel>
            </StatItem>
          </StatsGrid>
        </ProfileSection>
      </ProfileContainer>
    </ProfileWrapper>
  );
};

export default ProfilePage; 