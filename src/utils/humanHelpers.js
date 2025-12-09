// ====================================================================
// humanHelpers.js — FINAL 2025 VERSION
// src/utils/humanHelpers.js
// Human-like typing, randomized delay, cooldown persistence, anti-ban
// ====================================================================

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------
// Persistent Cooldown (Saved to disk)
// ---------------------------------------------------------------
const COOLDOWN_FILE_PATH = path.join('data', 'cooldowns.json');

if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

let cooldownTimer = null;
const DEBOUNCE_DELAY_MS = 5000;

// ---------------------------------------------------------------
// BASIC UTILITIES
// ---------------------------------------------------------------
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(min = 200, max = 600) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Delay manusia (di-adjust berdasarkan jam aktivitas manusia)
async function humanDelay(min = 700, max = 2200) {
    const hr = new Date().getHours();

    // 00:00 – 06:00 → manusia ngantuk = delay lebih lama
    if (hr >= 0 && hr <= 6) {
        min *= 1.4;
        max *= 1.6;
    }

    // Jam sibuk 07–10 & 17–20 → delay lebih cepat
    if ((hr >= 7 && hr <= 10) || (hr >= 17 && hr <= 20)) {
        min *= 0.85;
        max *= 0.85;
    }

    await sleep(jitter(min, max));
}

// ---------------------------------------------------------------
// REALISTIC TYPING SIMULATION — SAFE FOR WA WEB 2025
// ---------------------------------------------------------------
async function simulateTyping(client, chatId, text = "", totalDuration = 1500) {
    try {
        // Natural behavior: 30% pesan dikirim tanpa typing
        if (Math.random() < 0.30) return;

        // 60% peluang tampil sebagai online
        if (Math.random() < 0.60) {
            try { await client.sendPresenceAvailable(); } catch {}
        }

        // Start typing
        await client.sendPresenceUpdate("composing", chatId);

        const chars = text?.length || 12;

        // kecepatan per karakter
        const perChar = jitter(35, 75);
        let duration = perChar * chars;

        // Natural cap
        duration = Math.min(
            Math.max(duration, totalDuration * 0.6),
            totalDuration * 1.5
        );

        await sleep(duration);

        // Stop typing
        await client.sendPresenceUpdate("paused", chatId);

    } catch (err) {
        // fail-safe
        try { await client.sendPresenceUpdate("paused", chatId); } catch {}
    }
}

// ---------------------------------------------------------------
// PERSISTENT USER COOLDOWN (DEBOUNCED DISK WRITE)
// ---------------------------------------------------------------
function loadCooldowns() {
    if (!fs.existsSync(COOLDOWN_FILE_PATH)) return new Map();

    try {
        const raw = fs.readFileSync(COOLDOWN_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw);

        return new Map(Object.entries(parsed));
    } catch (e) {
        console.error("Cooldown load error:", e.message);
        return new Map();
    }
}

function writeCooldownsToDisk(map) {
    try {
        const obj = Object.fromEntries(map);
        fs.writeFileSync(
            COOLDOWN_FILE_PATH,
            JSON.stringify(obj, null, 2),
            'utf8'
        );
        console.log("[Disk] Cooldowns saved.");
    } catch (e) {
        console.error("Cooldown save error:", e.message);
    }
}

function saveCooldowns(map) {
    if (cooldownTimer) {
        clearTimeout(cooldownTimer);
    }
    cooldownTimer = setTimeout(() => {
        writeCooldownsToDisk(map);
        cooldownTimer = null;
    }, DEBOUNCE_DELAY_MS);
}

// ---------------------------------------------------------------
module.exports = {
    sleep,
    jitter,
    humanDelay,
    simulateTyping,
    loadCooldowns,
    saveCooldowns
};
