import * as dotenv from "dotenv";
import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { parseButtonsWithRetry } from "./parser";
import {
    getFormattedTime,
    sendError,
    sendManualStatus,
    sendOperational,
    sendStartupNotification,
    sendStatusChange,
} from "./notifier";
import { ParseResult } from "./types";

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Validate environment variables
if (!BOT_TOKEN || !CHAT_ID) {
    console.error("❌ Missing required environment variables:");
    if (!BOT_TOKEN) console.error("  - BOT_TOKEN");
    if (!CHAT_ID) console.error("  - CHAT_ID");
    console.error(
        "\nPlease check your .env file and ensure all required variables are set.",
    );
    process.exit(1);
}

// Initialize Telegram bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory state for status tracking
let previousStatus: ParseResult | null = null;
let isChecking = false; // Prevent concurrent checks

/**
 * Checks button statuses and sends notifications if changes detected
 */
async function checkAndNotify(): Promise<void> {
    if (isChecking) {
        console.log("⏳ Check already in progress, skipping...");
        return;
    }

    isChecking = true;

    try {
        console.log("🔍 Starting status check...");
        const result = await parseButtonsWithRetry();
        const now = getFormattedTime();

        // Check for changes and notify
        if (previousStatus) {
            // Check Актобе match
            if (!previousStatus.aktobe.isEnabled && result.aktobe.isEnabled) {
                console.log("🎫 Актобе match tickets became available!");
                await sendStatusChange(
                    bot,
                    CHAT_ID!,
                    "Матч с Актобе",
                    result.aktobe.href,
                );
            }

            // Check Реал Мадрид match
            if (
                !previousStatus.realMadrid.isEnabled &&
                result.realMadrid.isEnabled
            ) {
                console.log("🎫 Реал Мадрид match tickets became available!");
                await sendStatusChange(
                    bot,
                    CHAT_ID!,
                    "Матч с Реал Мадрид",
                    result.realMadrid.href,
                );
            }
        } else {
            console.log("📝 Initial status check - no notifications sent");
        }

        // Update previous status
        previousStatus = result;

        console.log(`✅ Check completed at ${now}:`);
        console.log(
            `   Актобе match: ${
                result.aktobe.isEnabled ? "enabled" : "disabled"
            }`,
        );
        console.log(
            `   Реал Мадрид match: ${
                result.realMadrid.isEnabled ? "enabled" : "disabled"
            }`,
        );
    } catch (error) {
        const errorText = error instanceof Error
            ? error.message
            : "Unknown error";
        console.error("❌ Error during status check:", errorText);
        await sendError(bot, CHAT_ID!, errorText);
    } finally {
        isChecking = false;
    }
}

// Schedule checks every 5 minutes
cron.schedule("*/2 * * * *", () => {
    console.log("⏰ Scheduled check triggered");
    checkAndNotify().catch(console.error);
});

// Schedule operational notification every 3 hours
cron.schedule("0 */3 * * *", async () => {
    console.log("📢 Sending operational notification");
    try {
        await sendOperational(bot, CHAT_ID);
    } catch (error) {
        console.error("❌ Failed to send operational notification:", error);
    }
});

// Handle manual status check via Telegram command
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id.toString();

    // Security: Only allow from configured chat ID
    if (chatId !== CHAT_ID) {
        console.log(`🚫 Unauthorized access attempt from chat ID: ${chatId}`);
        return;
    }

    console.log("📱 Manual status check requested");

    try {
        const result = await parseButtonsWithRetry();
        await sendManualStatus(bot, chatId, result);
    } catch (error) {
        const errorText = error instanceof Error
            ? error.message
            : "Unknown error";
        console.error("❌ Error during manual status check:", errorText);
        await sendError(bot, chatId, errorText);
    }
});

// Handle help command
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id.toString();

    if (chatId !== CHAT_ID) {
        return;
    }

    const helpMessage = `🤖 Kairat Notify Bot - Справка\n\n` +
        `📋 Доступные команды:\n` +
        `• /status - Проверить текущий статус билетов\n` +
        `• /help - Показать эту справку\n\n` +
        `⏰ Автоматические проверки:\n` +
        `• Каждые 5 минут - проверка статуса\n` +
        `• Каждые 3 часа - операционное уведомление\n\n` +
        `🎫 События:\n` +
        `• Матч с Актобе\n` +
        `• Матч с Реал Мадрид\n\n` +
        `🔔 Уведомления приходят только при изменении статуса с "отключено" на "включено"`;

    try {
        await bot.sendMessage(chatId, helpMessage);
    } catch (error) {
        console.error("❌ Failed to send help message:", error);
    }
});

// Handle bot errors
bot.on("error", (error) => {
    console.error("❌ Telegram bot error:", error);
});

bot.on("polling_error", (error) => {
    console.error("❌ Telegram polling error:", error);
});

// Startup sequence
async function startBot(): Promise<void> {
    try {
        console.log("🚀 Starting Kairat Notify Bot...");
        console.log(`📱 Bot Token: ${BOT_TOKEN!.substring(0, 10)}...`);
        console.log(`💬 Chat ID: ${CHAT_ID}`);

        // Send startup notification
        await sendStartupNotification(bot, CHAT_ID!);

        // Perform initial check
        console.log("🔍 Performing initial status check...");
        await checkAndNotify();

        console.log("✅ Bot started successfully!");
        console.log("⏰ Monitoring every 5 minutes...");
        console.log("📢 Operational notifications every 3 hours...");
        console.log("💡 Send /status to check manually");
    } catch (error) {
        console.error("❌ Failed to start bot:", error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT, shutting down gracefully...");
    bot.stopPolling();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
    bot.stopPolling();
    process.exit(0);
});

// Start the bot
startBot().catch(console.error);
