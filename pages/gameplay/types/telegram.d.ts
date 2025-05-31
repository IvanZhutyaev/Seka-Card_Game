interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: TelegramWebAppUser;
        auth_date?: string;
        hash?: string;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    showAlert: (message: string) => void;
    showProgress: () => void;
    hideProgress: () => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp?: TelegramWebApp;
        };
    }
}

export type { TelegramWebAppUser }; 