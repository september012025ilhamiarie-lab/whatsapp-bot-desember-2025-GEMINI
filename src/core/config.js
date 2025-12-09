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

    // Reject incoming calls
    REJECT_CALLS: bool(process.env.BOT_REJECT_CALLS, true),

    // Cooldown (used by callHandler)
    COOLDOWN_IN_MINUTES: num(process.env.BOT_COOLDOWN_MINUTES, 1),

    // Cooldown Seconds (used by messageHandler)
    COOLDOWN_SECONDS: num(process.env.BOT_COOLDOWN_SECONDS, 3),


    // ===========================================================
    // PUPPETEER (STEALTH MODE) – WA Web Anti-Detect Settings
    // ===========================================================
    PUPPETEER_CONFIG: {
        // "new" mode = Chrome headless baru (lebih cepat & aman)
        headless: bool(process.env.PUPPETEER_HEADLESS, true) ? "new" : false,

        // Optional Chrome path (jika ingin pakai Chrome custom)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

        args: [
            "--user-data-dir=./chrome_profile",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-infobars",
            "--disable-gpu",

            // Stealth Mode Anti-Detect (WA 2024–2025)
            "--disable-blink-features=AutomationControlled",
            "--disable-blink-features=AutomationControlled,AutomationControlledFrame",
            "--disable-features=IsolateOrigins,site-per-process",

            // Optimized performance
            "--window-size=1280,720",
            "--start-maximized",
            "--single-process",
            "--renderer-process-limit=1",
            '--js-flags="--max_old_space_size=256"',
        ],
    },
};
