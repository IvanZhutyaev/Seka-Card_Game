interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: TelegramUser;
        query_id?: string;
        auth_date?: number;
        hash?: string;
    };
    version: string;
    platform: string;
    colorScheme: string;
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
    };
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    expand(): void;
    close(): void;
    showAlert(message: string, callback?: () => void): void;
    showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
    enableClosingConfirmation(): void;
    disableClosingConfirmation(): void;
    onEvent(eventType: string, eventHandler: Function): void;
    offEvent(eventType: string, eventHandler: Function): void;
    sendData(data: string): void;
    openLink(url: string): void;
    openTelegramLink(url: string): void;
    openInvoice(url: string, callback?: (status: string) => void): void;
    setHeaderColor(color: string): void;
    setBackgroundColor(color: string): void;
    ready(): void;
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        setText(text: string): void;
        onClick(callback: Function): void;
        offClick(callback: Function): void;
        show(): void;
        hide(): void;
        enable(): void;
        disable(): void;
        showProgress(leaveActive: boolean): void;
        hideProgress(): void;
    };
    BackButton: {
        isVisible: boolean;
        onClick(callback: Function): void;
        offClick(callback: Function): void;
        show(): void;
        hide(): void;
    };
    HapticFeedback: {
        impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
        notificationOccurred(type: 'error' | 'success' | 'warning'): void;
        selectionChanged(): void;
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
} 