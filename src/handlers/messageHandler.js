// ===============================================================
//  MESSAGE HANDLER – FINAL 2025 EDITION
//  Fully compatible with WWebJS Multi-Device + LID Resolver
//  Zero-Crash JID handling, human-like typing, anti-ban filters
// ===============================================================

const { sanitizeJid, resolveContact } = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');

// Runtime cooldown & typing lock (tidak disimpan ke disk)
const messageCooldown = new Map();
const typingLocks = new Map();

async function legacyMessageHandler (client, msg) {

    try {

        // ─────────────────────────────────────────────
        // 1. BASIC FILTER (Anti banned)
        // ─────────────────────────────────────────────
        if (!msg || !msg.from || msg.fromMe) return;
        if (msg.isStatus) return;                   // status update
        if (msg.from.endsWith("@broadcast")) return;     // ignore broadcast
        if (msg.from.endsWith("@newsletter")) return;     // ignore broadcast
        if (msg.from.endsWith("@g.us")) return;     // ignore GROUP
        if (!msg.body || !msg.body.trim()) return;  // pesan kosong

        console.log("\n\n=========PESAN MASUK===========\n");
        console.log(msg);
        const sender = msg.from;
        const text = msg.body.trim();
        const idPesan = msg.id.id;
        const now = Date.now();

        // ─────────────────────────────────────────────
        // 2. ANTI SPAM COOLDOWN (Random 1.4–3 detik)
        // ─────────────────────────────────────────────
        const randomCooldown = 1400 + Math.floor(Math.random() * 1600);
        const last = messageCooldown.get(sender);

        if (last && now - last < randomCooldown) return;
        messageCooldown.set(sender, now);

        // ─────────────────────────────────────────────
        // 3. HUMAN-LIKE READ BEHAVIOR (tidak selalu read)
        // ─────────────────────────────────────────────
        try {
            const chat = await msg.getChat();

            if (Math.random() < 0.55) { // 55% chance read
                const readDelay = Math.min(3500, Math.max(800, text.length * 32));
                await humanDelay(readDelay * 0.5, readDelay);
                await chat.sendSeen();
            }
        } catch (err) {
            console.warn("⚠️ read error:", err.message);
        }

        // ─────────────────────────────────────────────
        // 4. RESOLVE CONTACT (LID → nomor@c.us)
        // ─────────────────────────────────────────────
        const contact = await resolveContact(client, sender);
        console.log("nilai contact:");
        console.log(contact);

        if (!contact) return;

        const jid = sanitizeJid(contact.id);       // ALWAYS string @c.us
        const number = contact.number;             // "628xxxx"
        console.log("\n\n\n=======NILAI JID:  " + jid + "=========\n\n");

        let pushname = null;
        if (contact.pushname && contact.pushname.trim() !== "") {
            pushname = contact.pushname;
        } else if (msg.notifyName && msg.notifyName.trim() !== "") {
            pushname = msg.notifyName;
        }


        if (!jid) {
            console.warn("❌ Invalid JID, message skipped:", sender);
            return;
        }

        // ─────────────────────────────────────────────
        // 5. BUILD REPLY (Aman untuk banned)
        // ─────────────────────────────────────────────
        const reply =
            `Halo @${number} ${pushname ? `(${pushname})` : ""} 👋\n` +
            `Pesan kamu sudah diterima.\n` +
            `Ini balasan otomatis dari bot 😊`;



        // // ─────────────────────────────────────────────
        // // 6. TYPING LOCK (hindari flood typing)
        // // ─────────────────────────────────────────────
        // if (typingLocks.get(jid)) return;
        // typingLocks.set(jid, true);

        // try {
        //     // ─────────────────────────────────────────
        //     // 7. HUMAN-LIKE TYPING
        //     // ─────────────────────────────────────────
        //     await humanDelay(700, 1800);

        //     const typingTime = Math.min(2800, Math.max(850, reply.length * 27));
        //     await simulateTyping(client, jid, reply, typingTime);

        //     await humanDelay(280, 750);

        //     // ─────────────────────────────────────────
        //     // 8. SEND REPLY
        //     //    Notes:
        //     //    - Mentions MUST be string array
        //     //    - using sanitizeJid to avoid crash
        //     // ─────────────────────────────────────────

        //     //await client.sendMessage(jid, reply);

        //     await client.sendMessage(jid, reply, {
        //         quotedMessageId: "false_" + jid + "_" + idPesan,
        //         mentions: [jid]
        //     });

        // } finally {
        //     typingLocks.delete(jid);
        // }

    } catch (err) {
        console.error("❌ message handler error:", err);
    }
};


async function enhancedMessageHandler(client, msg, messageService) {
    try {
        console.log("\n===== [ENHANCED HANDLER] PESAN MASUK =====");
        console.log("[DARI]:", msg.from);
        console.log("[ISI ]:", msg.body);

        if (!msg || !msg.from || msg.fromMe) return;

        const sender = msg.from;
        const now = Date.now();

        // anti spam
        const randomCooldown = 1400 + Math.floor(Math.random() * 1600);
        const last = messageCooldown.get(sender);
        if (last && now - last < randomCooldown) return;
        messageCooldown.set(sender, now);

        // resolve JID
        const contact = await resolveContact(client, sender);
        if (!contact) return;

        const jid = sanitizeJid(contact.id);
        const number = contact.number;

        // =============================================
        // PANGGIL FUNGSI-FUNGSI BARU
        // =============================================

        await messageService.sendText(jid, "Halo! Pesan kamu saya terima.");
        await messageService.sendReaction(msg, "👍");

        // contoh quoted
        // await messageService.sendTextQuoted(jid, "Ini quoted", msg);

        // contoh push ke database
        // await messageService.saveInbox(jid, msg.body);

    } catch (err) {
        console.error("❌ enhanced handler error:", err);
    }
}



// ====================================================================
// 3) EXPORT MODE GANDA
// ====================================================================
// WhatsAppBot boleh pilih handler mana yg mau dipakai

module.exports = {
    legacyMessageHandler,     // handler lama
    enhancedMessageHandler    // handler baru (pakai messageService)
};



