// src/handlers/callHandler.js
const resolveContact = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');
const config = require('../core/config');

const callCooldown = new Map();  
const typingLocks = new Map();   

module.exports = async function (client, call) {
    try {
        if (!config.REJECT_CALLS) return;

        const sender = call.from;
        const now = Date.now();

        // ─────────────────────────────────────────────
        // 1. Reject Call (humanize sedikit)
        // ─────────────────────────────────────────────
        try {
            await humanDelay(300, 1200);  // reject tidak instan
            if (typeof call.reject === "function") {
                await call.reject();
            } else if (client.rejectCall) {
                await client.rejectCall(call.id);
            }
        } catch (e) {
            console.warn("⚠️ reject call gagal:", e.message);
        }

        // ─────────────────────────────────────────────
        // 2. Cooldown anti-spam (per JID 45–90 detik)
        // ─────────────────────────────────────────────
        const last = callCooldown.get(sender);
        const COOLDOWN = (config.COOLDOWN_IN_MINUTES * 60000) || 45000;

        if (last && now - last < COOLDOWN) {
            return; // jangan spam balik user
        }
        callCooldown.set(sender, now);

        // ─────────────────────────────────────────────
        // 3. Resolve Contact (fix LID → c.us)
        // ─────────────────────────────────────────────
        const resolved = await resolveContact(client, sender);
        if (!resolved) return;

        const jid = resolved.id?._serialized;
        const number = resolved.number;
        const name = resolved.pushname || resolved.name || number;

        // ─────────────────────────────────────────────
        // 4. Build reply
        // ─────────────────────────────────────────────
        const reply =
            `Halo @${number} (${name}), ` +
            `nomor ini tidak bisa menerima panggilan ya 🙏\n` +
            `Silakan kirim chat saja.`;

        // ─────────────────────────────────────────────
        // 5. Typing lock (anti double reply)
        // ─────────────────────────────────────────────
        if (typingLocks.get(jid)) return;
        typingLocks.set(jid, true);

        try {
            // ─────────────────────────────────────────
            // 6. Simulate typing sebelum kirim
            // ─────────────────────────────────────────
            await humanDelay(900, 2300);
            const typeTime = Math.min(2500, Math.max(900, reply.length * 30));
            await simulateTyping(client, jid, reply, typeTime);

            await humanDelay(300, 1200);

            // ─────────────────────────────────────────
            // 7. Kirim pesan + MENTION CONTACT (bukan JID!)
            // ─────────────────────────────────────────
            await client.sendMessage(jid, reply, {
                mentions: [resolved] // FIX: WAJIB pakai contact
            });

        } finally {
            typingLocks.delete(jid);
        }

    } catch (err) {
        console.error("❌ callHandler error:", err);
    }
};
