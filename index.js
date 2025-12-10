// index.js
require('dotenv').config();
const WhatsAppBot = require('./src/core/WhatsAppBot');

process.on("unhandledRejection", (reason, promise) => {
    console.error("🔥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("🔥 Uncaught Exception:", err);
});

process.on("SIGINT", () => {
    console.log("⚠️ SIGINT diterima. Menutup bot...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("⚠️ SIGTERM diterima. Menutup bot...");
    process.exit(0);
});

// --- BOT STARTUP WRAPPER ---
async function main() {
    try {
        console.log("🚀 Starting WhatsApp Bot...");
        const bot = new WhatsAppBot();

        console.log("[index.js] Initializing bot...");
        bot.initialize(); // tidak perlu await karena client.initialize() async

        // Tunggu ready event untuk menandakan bot siap
        bot.client.on("ready", () => {
            console.log("✅ WhatsApp Bot Berhasil Dijalankan dan siap!");
            console.log("[index.js] OutboxHandler status:", bot.outboxHandler.isRunning ? "Running" : "Stopped");
        });

    } catch (err) {
        console.error("❌ Gagal memulai bot:", err);
        process.exit(1);
    }
}

main();
