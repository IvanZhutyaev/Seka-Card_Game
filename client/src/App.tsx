import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Game from './Game';
import MainMenuPage from './pages/MainMenuPage';
import RulesPage from './pages/RulesPage';
import ProfilePage from './pages/ProfilePage';
import useGameStore from './store/gameStore';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: string;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        showAlert: (message: string) => void;
      };
    };
  }
}

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<MainMenuPage />} />
      <Route path="/game/:gameId" element={<Game />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
};

function App() {
  const connect = useGameStore((state) => state.connect);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
    
    connect();
  }, [connect]);
  
  return (
    <Router>
      <div className="App">
        <AppContent />
      </div>
    </Router>
  );
}

export default App; 