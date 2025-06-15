interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
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
}

declare global {
  interface Window {
    Telegram: {
      WebApp: TelegramWebApp;
    };
  }
}

export {}; 