export interface ButtonStatus {
    isEnabled: boolean;
    href: string;
}

export interface ParseResult {
    aktobe: ButtonStatus; // Match against Актобе
    realMadrid: ButtonStatus; // Match against Реал Мадрид
}

export interface NotificationConfig {
    botToken: string;
    chatId: string;
}
