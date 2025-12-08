// index.js
require('dotenv').config(); // Muat variabel environment
const WhatsAppBot = require('./src/core/WhatsAppBot');

// === GLOBAL SAFETY HANDLERS ===
process.on("unhandledRejection", (reason, promise) => {
    console.error("🔥 Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("🔥 Uncaught Exception:", err);
    // optional: exit to let PM2 restart
    // process.exit(1);
});

// === GRACEFUL SHUTDOWN ===
process.on("SIGINT", () => {
    console.log("⚠️ SIGINT diterima. Menutup bot...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("⚠️ SIGTERM diterima. Menutup bot...");
    process.exit(0);
});

// === BOT STARTUP WRAPPER ===
async function main() {
    try {
        console.log("🚀 Starting WhatsApp Bot...");
        const bot = new WhatsAppBot();
        await bot.initialize();
        console.log("✅ WhatsApp Bot Berhasil Dijalankan");
    } catch (err) {
        console.error("❌ Gagal memulai bot:", err);
        process.exit(1);
    }
}

main();
