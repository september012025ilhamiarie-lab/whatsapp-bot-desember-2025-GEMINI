// ====================================================================
//  CONFIG.JS – FINAL 2025 (Updated for LID-Resolver System)
//  Clean, Safe, Production Ready, Centralized Env Parser
// ====================================================================

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
    // DATABASE PARAMETERS (Inbox / Outbox)
    // ===========================================================
    PENGIRIM_INBOX_OUTBOX:
        process.env.PENGIRIM_INBOX_OUTBOX || "addonwaarik",

    AKHIRAN_WHATSAPP_KE_OUTBOX:
        process.env.AKHIRAN_WHATSAPP_KE_OUTBOX || "whatsapp.center",


    // ===========================================================
    // BOT FEATURES
    // ===========================================================

    // Auto-reject incoming calls from WA Web (recommended anti-ban)
    REJECT_CALLS: bool(process.env.BOT_REJECT_CALLS, true),

    // Cooldown untuk auto-block spam caller
    COOLDOWN_IN_MINUTES: num(process.env.BOT_COOLDOWN_MINUTES, 1),

    // Cooldown message handler
    COOLDOWN_SECONDS: num(process.env.BOT_COOLDOWN_SECONDS, 3),


    // ===========================================================
    // OUTBOX QUEUE SYSTEM
    // ===========================================================
    OUTBOX_BATCH_LIMIT: num(process.env.OUTBOX_BATCH_LIMIT, 20),
    OUTBOX_INTERVAL_MS: num(process.env.OUTBOX_INTERVAL_MS, 2000),

    // Delay AC (Anti Ban)
    MIN_DELAY_MS: num(process.env.MIN_DELAY_MS, 900),
    MAX_DELAY_MS: num(process.env.MAX_DELAY_MS, 3000),

    // Retry jika kirim error
    MAX_RETRIES: num(process.env.MAX_RETRIES, 3),


    // ===========================================================
    // PUPPETEER STEALTH CONFIG (Anti WA Detect 2025)
    // ===========================================================
    PUPPETEER_CONFIG: {
        headless: bool(process.env.PUPPETEER_HEADLESS, true) ? "new" : false,

        // Path Chrome custom (opsional)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

        args: [
            "--user-data-dir=./chrome_profile",

            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-infobars",
            "--disable-gpu",

            // Anti WA Automation Detect
            "--disable-blink-features=AutomationControlled",
            "--disable-blink-features=AutomationControlled,AutomationControlledFrame",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-web-security",

            // Performance
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
