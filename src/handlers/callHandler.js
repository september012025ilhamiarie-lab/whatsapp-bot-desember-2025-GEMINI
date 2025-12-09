// ===============================================================
//  CALL HANDLER – FINAL 2025 EDITION
//  Fully compatible with WWebJS MD + LID Resolver
//  Reject Call Safely + Auto Reply + Humanized Behavior
//  /src/handlers/callHandler.js
// ===============================================================

const { resolveContact, sanitizeJid } = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');
const config = require('../core/config');

// Runtime memory (tidak disimpan ke disk)
const callCooldown = new Map();
const typingLocks = new Map();

module.exports = async function (client, call) {
    try {
        // =============================================
        // 0. FEATURE TOGGLE
        // =============================================
        if (!config.REJECT_CALLS) return;

        console.info("\n🔔 [CALL-INCOMING] ==========");
        console.info(call);

        const sender = call.from;
        const now = Date.now();

        // =============================================
        // 1. SAFE REJECT CALL
        // =============================================
        try {
            console.info("📞 Rejecting call safely...");

            await humanDelay(300, 1300); // anti-bot

            if (typeof call.reject === "function") {
                await call.reject();
            } else if (client.rejectCall) {
                await client.rejectCall(call.id);
            } else {
                console.warn("⚠️ No valid reject method found.");
            }

        } catch (err) {
            console.warn("⚠️ Reject call failed:", err.message);
        }

        // =============================================
        // 2. PER-JID COOLDOWN (PREVENT SPAM REPLY)
        // =============================================
        console.info("⏱ Checking cooldown...");

        const last = callCooldown.get(sender);
        const cdMinutes = config.COOLDOWN_IN_MINUTES || 1;
        const COOLDOWN_MS = cdMinutes * 60000;

        if (last && now - last < COOLDOWN_MS) {
            console.info("🚫 Cooldown active. No auto-reply.");
            return;
        }
        callCooldown.set(sender, now);

        // =============================================
        // 3. LID → JID RESOLUTION (NO AUTO-BAN)
        // =============================================
        console.info("🔍 Resolving contact:", sender);

        const resolved = await resolveContact(client, sender);

        console.info("📌 RESOLVED:", resolved);
        if (!resolved) return;

        const jid = sanitizeJid(resolved.id);
        const number = resolved.number;
        const name = resolved.pushname || number;

        if (!jid) {
            console.warn("❌ Invalid JID:", sender);
            return;
        }

        console.info("🎯 Target JID:", jid);

        // =============================================
        // 4. AUTO REPLY TEMPLATE
        // =============================================
        const reply =
            `Halo Kak @${number} (${name}), ` +
            `nomor ini *tidak bisa menerima panggilan* ya 🙏\n` +
            `Silakan kirim chat saja agar bisa kami balas.`;

        // =============================================
        // 5. TYPING LOCK
        // =============================================
        if (typingLocks.get(jid)) {
            console.info("🚫 Typing lock active. Skip.");
            return;
        }
        typingLocks.set(jid, true);

        // =============================================
        // 6. TYPING SIMULATION + DELAY
        // =============================================
        try {
            await humanDelay(900, 2400);

            const typingTime = Math.min(2600, Math.max(900, reply.length * 30));

            console.info(`⌨️ Simulate typing for ${typingTime}ms...`);
            await simulateTyping(client, jid, reply, typingTime);

            await humanDelay(300, 900);

            // =============================================
            // 7. SEND AUTO REPLY
            // =============================================
            console.info("✉️ Sending auto reply...");

            await client.sendMessage(jid, reply, {
                mentions: [sanitizeJid(jid)]
            });

        } finally {
            typingLocks.delete(jid);
        }

    } catch (err) {
        console.error("❌ callHandler error:", err);
    }
};
