import React, { useEffect } from 'react';
import './MainMenuPage.css'; // We will create this file later

const MainMenuPage = () => {
  useEffect(() => {
    // Logic from telegram-init.js and other scripts can be integrated here
    // For example, initializing the Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
    }
  }, []);

  return (
    <div className="main-menu-container">
      <div className="profile-top-bar">
        <div className="profile-header">
          <div className="avatar-container">
            {/* Placeholder for avatar */}
            <div className="default-avatar"></div>
          </div>
          <div>
            <div className="balance">
              {/* Placeholder for balance */}
              1000 $
            </div>
          </div>
        </div>
        <button className="menu-button">
          <div className="menu-line"></div>
          <div className="menu-line"></div>
          <div className="menu-line"></div>
        </button>
      </div>
      
      {/* Dropdown Menu would be a separate component */}

      <div className="title-section">
        <h1 className="title">SEKA</h1>
        <div className="divider"></div>
      </div>

      <div className="button-container">
        <button className="image-button" onClick={() => window.location.href = '/game'}>
          {/* The background image is set via CSS */}
        </button>
        <div className="button-label">Играть</div>
      </div>

    </div>
  );
};

export default MainMenuPage; 