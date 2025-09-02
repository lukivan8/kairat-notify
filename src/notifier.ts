import TelegramBot from "node-telegram-bot-api";
import { formatInTimeZone } from "date-fns-tz";
import { ParseResult } from "./types";

const TIMEZONE = "Asia/Almaty"; // GMT+5 equivalent

/**
 * Gets the current time formatted for GMT+5 timezone
 * @returns string - Formatted timestamp
 */
export function getFormattedTime(): string {
    const now = new Date();
    return formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd HH:mm");
}

/**
 * Sends a notification message to Telegram
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 * @param message - Message to send
 */
export async function sendNotification(
    bot: TelegramBot,
    chatId: string,
    message: string,
): Promise<void> {
    try {
        await bot.sendMessage(chatId, message);
        console.log("Notification sent:", message);
    } catch (error) {
        console.error("Failed to send notification:", error);
        throw error;
    }
}

/**
 * Sends a status change notification when tickets become available
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 * @param eventTitle - Name of the event (Control Event or Main Event)
 * @param href - Link to the tickets
 */
export async function sendStatusChange(
    bot: TelegramBot,
    chatId: string,
    eventTitle: string,
    href: string,
): Promise<void> {
    const message =
        `🎫 Для события "${eventTitle}" статус изменился, билеты в продаже!\n\n🔗 Ссылка: ${href}`;
    await sendNotification(bot, chatId, message);
}

/**
 * Sends operational status notification every 3 hours
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 */
export async function sendOperational(
    bot: TelegramBot,
    chatId: string,
): Promise<void> {
    const lastTime = getFormattedTime();
    const message =
        `✅ Все работает корректно, без ошибок.\n\n🕐 Последний запрос: ${lastTime} (GMT+5)`;
    await sendNotification(bot, chatId, message);
}

/**
 * Sends error notification when something goes wrong
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 * @param errorText - Error description
 */
export async function sendError(
    bot: TelegramBot,
    chatId: string,
    errorText: string,
): Promise<void> {
    const timestamp = getFormattedTime();
    const message =
        `❌ Возникла ошибка во время запроса:\n\n${errorText}\n\n🕐 Время: ${timestamp} (GMT+5)`;
    await sendNotification(bot, chatId, message);
}

/**
 * Sends manual status check response
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 * @param result - Current button statuses
 */
export async function sendManualStatus(
    bot: TelegramBot,
    chatId: string,
    result: ParseResult,
): Promise<void> {
    const timestamp = getFormattedTime();

    const aktobeStatus = result.aktobe.isEnabled
        ? `✅ Включено (Ссылка: ${result.aktobe.href})`
        : "❌ Отключено";

    const realMadridStatus = result.realMadrid.isEnabled
        ? `✅ Включено (Ссылка: ${result.realMadrid.href})`
        : "❌ Отключено";

    const message = `📊 Текущий статус билетов:\n\n` +
        `🎯 Матч с Актобе: ${aktobeStatus}\n` +
        `🎯 Матч с Реал Мадрид: ${realMadridStatus}\n\n` +
        `🕐 Время проверки: ${timestamp} (GMT+5)` +
        "\n\n" +
        `Источник: https://fckairat.com/match`;

    await sendNotification(bot, chatId, message);
}

/**
 * Sends startup notification when bot starts
 * @param bot - Telegram bot instance
 * @param chatId - Target chat ID
 */
export async function sendStartupNotification(
    bot: TelegramBot,
    chatId: string,
): Promise<void> {
    const timestamp = getFormattedTime();
    const message = `🚀 Kairat Notify Bot запущен!\n\n` +
        `📅 Время запуска: ${timestamp} (GMT+5)\n` +
        `⏰ Проверка каждые 5 минут\n` +
        `📢 Операционные уведомления каждые 3 часа\n\n` +
        `💡 Используйте /status для ручной проверки`;

    await sendNotification(bot, chatId, message);
}
