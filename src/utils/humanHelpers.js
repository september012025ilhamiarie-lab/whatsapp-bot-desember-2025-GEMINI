// src/utils/humanHelpers.js
const fs = require('fs');
const path = require('path');

const COOLDOWN_FILE_PATH = path.join('data', 'cooldowns.json'); 
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// --- DEBOUNCE CONFIG ---
let cooldownTimer = null;
const DEBOUNCE_DELAY_MS = 5000; // Simpan ke disk hanya setiap 5 detik

// --- FUNGSI WAKTU DASAR & ANTI-DETEKSI ---

function nowHour() { return new Date().getHours(); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function jitter(min = 200, max = 600) { return Math.floor(Math.random() * (max - min + 1) + min); }

async function humanDelay(min = 700, max = 2400) {
    const hour = nowHour();
    if (hour >= 0 && hour <= 6) { min *= 2; max *= 2; }
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
        min = Math.floor(min * 0.65); max = Math.floor(max * 0.85);
    }
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await sleep(delay);
}

async function simulateTyping(client, chatId, text = "", totalDuration = 1400) {
    try {
        await client.sendPresenceAvailable();
        await client.sendPresenceUpdate("composing", chatId);
        const length = text.length || 10;
        const perChar = Math.max(20, Math.floor(totalDuration / length));
        for (let i = 0; i < length; i++) {
            await sleep(Math.floor(perChar * (0.55 + Math.random() * 0.9)));
        }
        await client.sendPresenceUpdate("paused", chatId);
        return true;
    } catch (e) {
        try { await client.sendPresenceUpdate("paused", chatId); } catch {}
        return false;
    }
}

// --- FUNGSI PERSISTENSI COOLDOWN (DEBOUNCED) ---

function loadCooldowns() {
    if (!fs.existsSync(COOLDOWN_FILE_PATH)) return new Map();
    try {
        const data = fs.readFileSync(COOLDOWN_FILE_PATH, 'utf8');
        const obj = JSON.parse(data);
        return new Map(Object.entries(obj));
    } catch (error) {
        console.error("Error loading cooldowns:", error.message);
        return new Map();
    }
}

function _writeCooldownsToDisk(cooldowns) {
    const obj = Object.fromEntries(cooldowns);
    try {
        fs.writeFileSync(COOLDOWN_FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
        console.log(`[Disk] Cooldowns berhasil disimpan.`);
    } catch (error) {
        console.error("Error saving cooldowns:", error.message);
    }
}

function saveCooldownsDebounced(cooldowns) {
    if (cooldownTimer) {
        clearTimeout(cooldownTimer);
    }
    
    cooldownTimer = setTimeout(() => {
        _writeCooldownsToDisk(cooldowns);
        cooldownTimer = null;
    }, DEBOUNCE_DELAY_MS);
}

module.exports = {
    sleep, humanDelay, jitter, simulateTyping,
    loadCooldowns,
    saveCooldowns: saveCooldownsDebounced, 
};