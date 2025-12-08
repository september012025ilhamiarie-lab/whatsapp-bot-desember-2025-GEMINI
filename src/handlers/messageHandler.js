// src/handlers/messageHandler.js
const resolveContact = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');

// Runtime-only cooldown & locks
const messageCooldown = new Map();
const typingLocks = new Map();

module.exports = async function (client, msg) {
    try {
        // ─────────────────────────────────────────────
        // 1. Basic Filter (anti-banned)
        // ─────────────────────────────────────────────
        if (!msg || !msg.from || msg.fromMe) return;
        if (msg.isStatus) return;
        if (msg.from.endsWith("@g.us")) return;
        if (!msg.body || !msg.body.trim()) return;

        const sender = msg.from;
        const text = msg.body.trim();
        const now = Date.now();

        // ─────────────────────────────────────────────
        // 2. Anti-Spam Cooldown (1.5 – 3 detik)
        // ─────────────────────────────────────────────
        const last = messageCooldown.get(sender);
        const COOLDOWN = 1500 + Math.floor(Math.random() * 1500);

        if (last && now - last < COOLDOWN) return;
        messageCooldown.set(sender, now);

        // ─────────────────────────────────────────────
        // 3. Human-like read behavior (tidak selalu read)
        // ─────────────────────────────────────────────
        try {
            const chat = await msg.getChat();

            // 50% chance read
            if (Math.random() < 0.50) {
                const readDelay = Math.min(3000, Math.max(800, text.length * 35));
                await humanDelay(readDelay * 0.5, readDelay);
                await chat.sendSeen();
            }
        } catch (e) {
            console.warn("read error:", e.message);
        }

        // ─────────────────────────────────────────────
        // 4. Resolve Contact (LID → c.us)
        // ─────────────────────────────────────────────
        const resolved = await resolveContact(client, sender);
        if (!resolved) return;

        const jid = resolved.id?._serialized;     // selalu @c.us
        const number = resolved.number;           // 628xxxx
        const pushname = resolved.pushname || resolved.name || number;

        // ─────────────────────────────────────────────
        // 5. Build reply
        // ─────────────────────────────────────────────
        const reply =
            `Halo @${number} (${pushname}), pesan kamu sudah diterima 😊\n` +
            `Ini balasan otomatis dari bot.`;

        // ─────────────────────────────────────────────
        // 6. Typing Lock (anti flood)
        // ─────────────────────────────────────────────
        if (typingLocks.get(jid)) return;
        typingLocks.set(jid, true);

        try {
            // ─────────────────────────────────────────
            // 7. Human-like typing simulation
            // ─────────────────────────────────────────
            await humanDelay(700, 1800);
            const typingTime = Math.min(2600, Math.max(900, reply.length * 28));
            await simulateTyping(client, jid, reply, typingTime);

            await humanDelay(250, 750);

            // ─────────────────────────────────────────
            // 8. Send reply (mentions MUST use Contact)
            // ─────────────────────────────────────────
            await client.sendMessage(jid, reply, {
                mentions: [resolved]    // FIX MENTIONS
            });

        } finally {
            typingLocks.delete(jid);
        }

    } catch (err) {
        console.error("message handler error:", err);
    }
};
