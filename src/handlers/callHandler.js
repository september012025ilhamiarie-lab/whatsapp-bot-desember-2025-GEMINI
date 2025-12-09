// ===============================================================
//  CALL HANDLER – FINAL 2025 EDITION
//  Fully compatible with WWebJS Multi-Device + LID Resolver
//  Reject Call Safely + Send Auto Reply + Humanized Behavior
// ===============================================================

const { resolveContact, sanitizeJid } = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');
const config = require('../core/config');

// Runtime memory (tidak disimpan ke disk)
const callCooldown = new Map();
const typingLocks = new Map();

module.exports = async function (client, call) {
    try {
        // ─────────────────────────────────────────────
        // 0. Feature toggle
        // ─────────────────────────────────────────────
        if (!config.REJECT_CALLS) return;
        console.info("\n\n\n=======ADA PANGGILAN MASUK========\n");
        console.info(call);
        
        const sender = call.from;
        const now = Date.now();

        // ─────────────────────────────────────────────
        // 1. REJECT CALL (tidak mendadak)
        // ─────────────────────────────────────────────
        try {
            console.info("Akan menjalankan reject call");
            await humanDelay(300, 1300); // agak natural

            if (typeof call.reject === "function") {
                await call.reject();
            } else if (client.rejectCall) {
                await client.rejectCall(call.id);
            }
        } catch (err) {
            console.warn("⚠️ Reject call gagal:", err.message);
        }

        // ─────────────────────────────────────────────
        // 2. PER-JID CALL COOLDOWN (45–90 detik default)
        // ─────────────────────────────────────────────
        console.info("Akan menjalankan callCooldown");
        const last = callCooldown.get(sender);
        const cdMinutes = config.COOLDOWN_IN_MINUTES || 1;
        const COOLDOWN_MS = cdMinutes * 60000;

        if (last && now - last < COOLDOWN_MS) {
            console.info("akan return jangan spam reply");
            return; // jangan spam reply
        }
        callCooldown.set(sender, now);

        // ─────────────────────────────────────────────
        // 3. RESOLVE CONTACT + FIX LID → @c.us
        // ─────────────────────────────────────────────
        console.info("akan resolve tujuan "+sender);
        const resolved = await resolveContact(client, sender);
        console.info(">>> RESOLVE CONTACT: ");
        console.info(resolved);
        
        if (!resolved) return;
        console.info("akan kirim pesan ke tujuan "+resolved.number);
        const jid = sanitizeJid(resolved.id);
        const number = resolved.number; // 628xxxx
        const name = resolved.pushname || number;

        if (!jid) {
            console.warn("❌ Invalid JID on call handler:", sender);
            return;
        }

        // ─────────────────────────────────────────────
        // 4. AUTO-REPLY MESSAGE
        // ─────────────────────────────────────────────
        const reply =
            `Halo Kak @${number} (${name}), ` +
            `nomor ini *tidak bisa menerima panggilan* ya 🙏\n` +
            `Silakan kirim chat saja agar bisa kami balas.`;


        // ─────────────────────────────────────────────
        // 5. TYPING LOCK (hindari double reply)
        // ─────────────────────────────────────────────
        if (typingLocks.get(jid)) return;
        typingLocks.set(jid, true);

        try {
            // ─────────────────────────────────────────
            // 6. TYPING SIMULATION
            // ─────────────────────────────────────────
            await humanDelay(900, 2400);
            const typeTime = Math.min(2600, Math.max(900, reply.length * 30));
            await simulateTyping(client, jid, reply, typeTime);

            await humanDelay(300, 900);

            // ─────────────────────────────────────────
            // 7. SEND MESSAGE (mentions MUST be string)
            // ─────────────────────────────────────────
            await client.sendMessage(jid, reply, {
                mentions: [ sanitizeJid(jid) ]
            });

        } finally {
            typingLocks.delete(jid);
        }

    } catch (err) {
        console.error("❌ callHandler error:", err);
    }
};
