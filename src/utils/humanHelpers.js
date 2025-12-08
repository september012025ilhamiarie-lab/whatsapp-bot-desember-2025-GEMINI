// src/utils/humanHelpers.js
const fs = require('fs');
const path = require('path');

const COOLDOWN_FILE_PATH = path.join('data', 'cooldowns.json');
if (!fs.existsSync('data')) fs.mkdirSync('data');

// ─────────────────────────────────────────────
// BASIC TIME UTILS
// ─────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(min = 200, max = 600) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function humanDelay(min = 700, max = 2200) {
    const hr = new Date().getHours();

    // malam → respons lebih lambat
    if (hr >= 0 && hr <= 6) {
        min *= 1.3; 
        max *= 1.4;
    }

    // jam sibuk → respons sedikit cepat
    if ((hr >= 7 && hr <= 10) || (hr >= 17 && hr <= 20)) {
        min *= 0.8; 
        max *= 0.9;
    }

    const d = jitter(min, max);
    return sleep(d);
}

// ─────────────────────────────────────────────
// REALISTIC TYPING SIMULATION – SAFE FOR 2025
// ─────────────────────────────────────────────

async function simulateTyping(client, chatId, text = "", duration = 1400) {
    try {
        // 💡 30% waktu: tidak typing sama sekali (lebih manusiawi)
        if (Math.random() < 0.30) return;

        // 💡 Online indicator: bukan selalu available
        if (Math.random() < 0.60) {
            try { await client.sendPresenceAvailable(); } catch {}
        }

        // Start typing
        await client.sendPresenceUpdate("composing", chatId);

        // Durasi typing tidak dihitung per karakter, tetapi random
        const minT = duration * 0.7;
        const maxT = duration * 1.3;
        const typingTime = jitter(minT, maxT);

        await sleep(typingTime);

        // Pause typing
        await client.sendPresenceUpdate("paused", chatId);

    } catch (err) {
        // fail-safe
        try { await client.sendPresenceUpdate("paused", chatId); } catch {}
    }
}

// ─────────────────────────────────────────────
// PERSISTENT COOLDOWN (ONLY USER COOLDOWN!)
// ─────────────────────────────────────────────

let cooldownTimer = null;
const DEBOUNCE = 5000;

function loadCooldowns() {
    try {
        if (!fs.existsSync(COOLDOWN_FILE_PATH)) return new Map();
        const data = fs.readFileSync(COOLDOWN_FILE_PATH, "utf8");
        const obj = JSON.parse(data);
        return new Map(Object.entries(obj));
    } catch {
        return new Map();
    }
}

function writeCooldowns(cool) {
    try {
        const obj = Object.fromEntries(cool);
        fs.writeFileSync(COOLDOWN_FILE_PATH, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error("Cooldown save error:", e.message);
    }
}

function saveCooldowns(cool) {
    if (cooldownTimer) clearTimeout(cooldownTimer);
    cooldownTimer = setTimeout(() => {
        writeCooldowns(cool);
        cooldownTimer = null;
    }, DEBOUNCE);
}

module.exports = {
    sleep,
    jitter,
    humanDelay,
    simulateTyping,
    loadCooldowns,
    saveCooldowns
};
