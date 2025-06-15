// telegram-webapp.d.ts
interface TelegramWebApp {
  initData: string;
  ready: () => void;
  // Add other properties and methods you use from the Telegram Web App script
}

interface Window {
  Telegram: {
    WebApp: TelegramWebApp;
  };
} 