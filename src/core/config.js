// ===============================================================
//  CONFIG.JS – FINAL 2025 EDITION
//  Clean, Safe, Anti-Detect, Production Ready
// ===============================================================

require("dotenv").config();

/* ---------------------------------------------------------------
   SAFE BOOLEAN PARSER
----------------------------------------------------------------*/
function bool(val, def = false) {
    if (val === undefined || val === null) return def;
    return ["true", "1", "yes", "y"].includes(String(val).toLowerCase());
}

/* ---------------------------------------------------------------
   SAFE NUMBER PARSER
----------------------------------------------------------------*/
function num(val, def = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : def;
}

/* ---------------------------------------------------------------
   EXPORT CONFIG
----------------------------------------------------------------*/
module.exports = {

    // ===========================================================
    // BOT FEATURES
    // ===========================================================

    // Auto-reject incoming calls from WA Web
    REJECT_CALLS: bool(process.env.BOT_REJECT_CALLS, true),

    // Cooldown for call-handler
    COOLDOWN_IN_MINUTES: num(process.env.BOT_COOLDOWN_MINUTES, 1),

    // Cooldown for message-handler
    COOLDOWN_SECONDS: num(process.env.BOT_COOLDOWN_SECONDS, 3),


    // ===========================================================
    // OUTBOX QUEUE SYSTEM
    // ===========================================================
    OUTBOX_BATCH_LIMIT: num(process.env.OUTBOX_BATCH_LIMIT, 20),     // max pesan sekali proses
    OUTBOX_INTERVAL_MS: num(process.env.OUTBOX_INTERVAL_MS, 2000),   // jeda antar batch

    // Delay antar pesan (anti-ban)
    MIN_DELAY_MS: num(process.env.MIN_DELAY_MS, 900),
    MAX_DELAY_MS: num(process.env.MAX_DELAY_MS, 3000),

    MAX_RETRIES: num(process.env.MAX_RETRIES, 3),    // retry jika kirim gagal


    // ===========================================================
    // PUPPETEER (STEALTH MODE) – Anti-Detect WhatsApp 2025
    // ===========================================================
    PUPPETEER_CONFIG: {
        headless: bool(process.env.PUPPETEER_HEADLESS, true) ? "new" : false,

        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

        args: [
            "--user-data-dir=./chrome_profile",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-infobars",
            "--disable-gpu",

            // Stealth Mode Anti WA Detect (2024–2025)
            "--disable-blink-features=AutomationControlled",
            "--disable-blink-features=AutomationControlled,AutomationControlledFrame",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-web-security",

            // Optimized Performance
            "--window-size=1280,720",
            "--start-maximized",
            "--single-process",
            "--renderer-process-limit=1",
            '--js-flags="--max_old_space_size=256"',

            // Reduce Fingerprint entropy
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
        ],
    },
};
