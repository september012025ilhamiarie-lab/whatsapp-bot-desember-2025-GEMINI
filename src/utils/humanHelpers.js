// src/utils/humanHelpers.js
const fs = require('fs');
const path = require('path');

// --- PENGATURAN FILE PERSISTENSI ---
const COOLDOWN_FILE_PATH = path.join('data', 'cooldowns.json'); 
// Pastikan folder data ada
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}


// --- FUNGSI WAKTU DASAR ---

function nowHour() {
    return new Date().getHours();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(min = 200, max = 600) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// --- FUNGSI ANTI-DETEKSI ---

async function humanDelay(min = 700, max = 2400) {
    const hour = nowHour();

    // Sesuaikan jeda berdasarkan jam (Simulasi jam sibuk)
    if (hour >= 0 && hour <= 6) { // Malam
        min *= 2;
        max *= 2;
    }
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) { // Jam Sibuk
        min = Math.floor(min * 0.65);
        max = Math.floor(max * 0.85);
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
        // Fallback untuk memastikan status typing dihentikan
        try { await client.sendPresenceUpdate("paused", chatId); } catch {}
        return false;
    }
}

// --- FUNGSI PERSISTENSI COOLDOWN ---

/**
 * Membaca data cooldown dari file JSON saat bot startup.
 * @returns {Map<string, number>} Map cooldown.
 */
function loadCooldowns() {
    if (!fs.existsSync(COOLDOWN_FILE_PATH)) {
        return new Map();
    }
    try {
        const data = fs.readFileSync(COOLDOWN_FILE_PATH, 'utf8');
        // Konversi Object dari JSON kembali ke Map
        const obj = JSON.parse(data);
        return new Map(Object.entries(obj));
    } catch (error) {
        console.error("Error loading cooldowns:", error.message);
        return new Map();
    }
}

/**
 * Menyimpan data cooldown ke file JSON setelah bot membalas pesan.
 * @param {Map<string, number>} cooldowns Map cooldown yang akan disimpan.
 */
function saveCooldowns(cooldowns) {
    const obj = Object.fromEntries(cooldowns);
    try {
        // Simpan data Map (sudah dikonversi ke Object) ke file JSON
        fs.writeFileSync(COOLDOWN_FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
        console.error("Error saving cooldowns:", error.message);
    }
}


module.exports = {
    sleep,
    humanDelay,
    jitter,
    simulateTyping,
    loadCooldowns, // Diperlukan oleh src/core/config.js
    saveCooldowns, // Diperlukan oleh src/handlers/*.js
};