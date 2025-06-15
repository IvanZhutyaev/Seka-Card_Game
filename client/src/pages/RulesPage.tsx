import React, { useEffect } from 'react';
import styled from 'styled-components';

// Styled Components
const RulesWrapper = styled.div`
  background-color: #0a1a2a;
  color: #e0e0e0;
  padding: 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;

  * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  width: 100%;
  position: relative;
  margin-bottom: 20px;
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
`;

const RulesContainer = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const RulesTitle = styled.h2`
  font-size: 24px;
  color: #4285f4;
  margin-bottom: 20px;
  text-align: center;
`;

const RuleSection = styled.section`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;

  h3 {
    color: #4285f4;
    margin-bottom: 10px;
  }

  p, ul {
    line-height: 1.6;
    margin-bottom: 15px;
  }

  li {
    margin-left: 20px;
  }
`;

const RulesPage = () => {
  const navigateBack = () => {
    // Logic to navigate back, e.g., using react-router-dom
    window.history.back();
  };
  
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.BackButton.show();
      tg.BackButton.onClick(navigateBack);
    }
    
    return () => {
      if (tg) {
        tg.BackButton.offClick(navigateBack);
      }
    }
  }, []);

  return (
    <RulesWrapper>
      <Header>
        <BackButton onClick={navigateBack}>←</BackButton>
        <h1 className="page-title">Правила игры</h1>
      </Header>
      <RulesContainer>
        <RuleSection>
          <h3>Цель игры</h3>
          <p>
            Цель игры "Сека" — набрать комбинацию карт, которая будет старше,
            чем у других игроков, и забрать банк.
          </p>
        </RuleSection>
        <RuleSection>
          <h3>Колода и игроки</h3>
          <p>
            Используется укороченная колода из 24 карт (от девятки до туза).
            В игре могут участвовать от 2 до 6 игроков.
          </p>
        </RuleSection>
        <RuleSection>
          <h3>Ход игры</h3>
          <p>
            В начале каждой раздачи все игроки делают обязательную начальную
            ставку. Затем каждому раздается по три карты.
          </p>
          <p>
            Торговля начинается с игрока, сидящего слева от дилера. У игрока
            есть несколько вариантов действий:
          </p>
          <ul>
            <li><b>Поставить (Bet):</b> Сделать ставку.</li>
            <li><b>Поддержать (Call):</b> Уравнять предыдущую ставку.</li>
            <li><b>Пас (Fold):</b> Сбросить карты и выйти из текущей раздачи.</li>
            <li>
              <b>Вскрыть карты (Showdown):</b> Если ставки уравнялись, игроки
              вскрывают карты.
            </li>
          </ul>
        </RuleSection>
        <RuleSection>
          <h3>Комбинации карт (по старшинству)</h3>
          <ul>
            <li><b>Сека:</b> Три карты одного ранга (например, три короля).</li>
            <li>
              <b>Свара:</b> Три карты одной масти. Очки считаются по номиналу (Туз - 11, Король - 4, Дама - 3, Валет - 2, 10 - 10, 9 - 9).
            </li>
            <li>
              <b>Две карты:</b> Две карты одной масти.
            </li>
             <li>
              <b>Просто очки:</b> Очки одной карты.
            </li>
          </ul>
        </RuleSection>
      </RulesContainer>
    </RulesWrapper>
  );
};

export default RulesPage; 