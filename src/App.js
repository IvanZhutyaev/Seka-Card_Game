import React, { useState, useEffect } from 'react';
import Game from './Game';
import { GlobalStyle } from './styles';

function App() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Получаем данные пользователя
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        alert('Нет данных инициализации Telegram!');
        setIsLoading(false);
        return;
      }

      // Валидация данных инициализации
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
        if (data.success) {
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
      alert('Telegram WebApp не найден!');
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