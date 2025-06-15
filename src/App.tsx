import React, { useState, useEffect } from 'react';
import Game from './Game.tsx'; // Update import to .tsx
import { GlobalStyle } from './styles';
import { UserInfo as UserInfoType } from './types'; // Import UserInfo type

function App() {
  const [userData, setUserData] = useState<UserInfoType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      const initData = window.Telegram.WebApp.initData;
      if (!initData) {
        alert('Нет данных инициализации Telegram!');
        setIsLoading(false);
        return;
      }

      fetch('/api/validate-init-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Web-App-Init-Data': initData
        },
        body: JSON.stringify({})
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && window.Telegram?.WebApp?.initDataUnsafe?.user) {
          setUserData(window.Telegram.WebApp.initDataUnsafe.user);
        } else {
          alert('Ошибка валидации данных Telegram!');
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error validating Telegram data:', error);
        alert('Ошибка при валидации данных Telegram!');
        setIsLoading(false);
      });
    } else {
      // Fallback for non-Telegram environment (for testing/development)
      setUserData({
        id: '1',
        first_name: 'Тестовый Игрок',
        photo_url: undefined 
      });
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (!userData) {
    return <div>Ошибка: не удалось получить данные пользователя</div>;
  }

  return (
    <>
      <GlobalStyle />
      <Game userData={userData} />
    </>
  );
}

export default App; 