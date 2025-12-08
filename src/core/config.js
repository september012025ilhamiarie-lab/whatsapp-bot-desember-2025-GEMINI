// src/core/config.js
require("dotenv").config();

// Safe boolean parser
function bool(val, def = false) {
    if (val === undefined) return def;
    return ["true", "1", "yes", "y"].includes(String(val).toLowerCase());
}

// Safe number parser
function num(val, def = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : def;
}

module.exports = {
    // BOT BEHAVIOR
    REJECT_CALLS: bool(process.env.BOT_REJECT_CALLS, true),
    COOLDOWN_SECONDS: num(process.env.BOT_COOLDOWN_SECONDS, 3),

    // Puppeteer Config — STEALTH MODE 2025
    PUPPETEER_CONFIG: {
        headless: bool(process.env.PUPPETEER_HEADLESS, true) ? "new" : false,

        // Optional path (Chrome external)
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

        args: [
            "--user-data-dir=./chrome_profile",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--no-first-run",
            "--no-zygote",
            "--window-size=1280,720",
            "--start-maximized",
            "--disable-infobars",
            "--disable-blink-features=AutomationControlled",
            "--disable-accelerated-2d-canvas",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-gpu",
            "--single-process",
            "--renderer-process-limit=1",
            '--js-flags="--max_old_space_size=256"',
        ],
    },
};
