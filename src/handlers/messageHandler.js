// ====================================================================
// MessageHandler.js — 2025 QUEUE-BASED OPTIMIZED
// - Single query pengirim per pesan
// - Resolusi LID → nomor HP
// - Filter grup / broadcast / status / newsletter
// - Fast path @c.us
// - Queue + cooldown + typing simulation
// - Cek pesan terlambat (>2 menit)
// ====================================================================

const { resolveContact, sanitizeJid } = require('../utils/contactResolver');
const { insertInbox } = require('../database/repo/inboxRepo');
const { getPengirimByNomor } = require('../database/repo/pengirimRepo');
const config = require('../core/config');

// Runtime maps
const messageCooldown = new Map();   // per JID anti-spam
const typingLocks = new Map();       // per JID typing lock

// ================================================================
// Normalize → convert any raw inbound JID to @c.us or @g.us
// ================================================================
function normalizeJid(raw) {
    if (!raw) return null;
    const s = String(raw).toLowerCase();
    if (s.endsWith('@c.us') || s.endsWith('@g.us')) return s;
    const digits = s.split('@')[0].replace(/\D/g, '');
    return digits.length >= 6 ? digits + '@c.us' : s;
}

// ================================================================
// Safe Typing Simulation
// ================================================================
async function safeTyping(client, jid, sample = '') {
    try {
        await client.sendPresenceUpdate('composing', jid);
        const ms = 400 + Math.min(1500, (sample.length || 10) * 50);
        await new Promise(r => setTimeout(r, ms));
        await client.sendPresenceUpdate('paused', jid);
    } catch (_) {}
}

// ================================================================
// Handle delayed messages (> thresholdMs)
// - Mengembalikan { delayed: boolean, dataPengirim: object|null }
// - Lengkap dengan console.log untuk debug
// ================================================================
async function handleDelayedMessage(msg, messageService, thresholdMs = 2 * 60 * 1000) {
    if (!msg?.timestamp) {
        console.log("⚠️ handleDelayedMessage → Pesan tidak memiliki timestamp, diabaikan");
        return { delayed: false, dataPengirim: null };
    }

    const msgTimestampMs = msg.timestamp * 1000; // WA timestamp → ms
    const now = Date.now();
    const delay = now - msgTimestampMs;

    console.log(`ℹ️ handleDelayedMessage → Pesan timestamp: ${msgTimestampMs} (${new Date(msgTimestampMs).toLocaleString()})`);
    console.log(`ℹ️ handleDelayedMessage → Sekarang: ${now} (${new Date(now).toLocaleString()})`);
    console.log(`ℹ️ handleDelayedMessage → Delay pesan: ${delay} ms`);

    const number = (msg.from || '').replace('@c.us', '');
    if (!number) {
        console.log("⚠️ handleDelayedMessage → Nomor pengirim tidak valid, diabaikan");
        return { delayed: false, dataPengirim: null };
    }

    console.log(`ℹ️ handleDelayedMessage → Nomor pengirim: +${number}`);

    let dataPengirim = null;
    try {
        dataPengirim = await getPengirimByNomor(number);
        if (dataPengirim) {
            console.log(`✔ handleDelayedMessage → Nomor +${number} terdaftar: ${dataPengirim.nama} (${dataPengirim.kode_reseller})`);
        } else {
            console.log(`⚠️ handleDelayedMessage → Nomor +${number} tidak ditemukan di tabel pengirim`);
        }
    } catch (err) {
        console.log(`❌ handleDelayedMessage → Error saat query getPengirimByNomor: ${err.message}`);
    }

    if (delay > thresholdMs) {
        console.log(`⚠️ handleDelayedMessage → Pesan terlambat (> ${thresholdMs} ms)`);
        if (dataPengirim && messageService?.sendText) {
            const preview = (msg.body || '').slice(0, 20);
            await messageService.sendText(msg.from,
                `Kak ${dataPengirim.nama} '${dataPengirim.kode_reseller}', isi pesan "${preview}" tidak dapat diproses, terlambat masuk (lebih dari 2 menit). Mohon kirim ulang ya. Mohon maaf sebelumnya.`
            );
            console.log(`ℹ️ handleDelayedMessage → Balasan pesan terlambat dikirim ke +${number}`);
        } else {
            console.log(`⚠️ handleDelayedMessage → Tidak dapat kirim balasan, nomor tidak terdaftar atau messageService tidak tersedia`);
        }
        return { delayed: true, dataPengirim };
    }

    console.log(`ℹ️ handleDelayedMessage → Pesan masih baru, delay ${delay} ms`);
    return { delayed: false, dataPengirim };
}

// ================================================================
// Enhanced Message Handler (queue-based, single-query)
// ================================================================
async function enhancedMessageHandler(client, msg, messageService) {
    console.log("\n──────────────────────────────────────────────");
    console.log("📩 MESSAGE HANDLER FINAL (QUEUE-BASED)");
    

    if (!msg || !msg.from) return;

    let remote = msg?.id?.remote || msg.from;

    // ================================================================
    // 1. QUICK IGNORE: broadcast / status / newsletter
    // ================================================================
    if (
        remote.endsWith('@g.us') ||
        remote.endsWith('@broadcast') ||
        remote.endsWith('@status') ||
        remote.endsWith('@newsletter')
    ) {
        console.log("Ignored '"+remote+"' because is group/broadcast/status/newsletter message.");
        return;
    }

    console.log("📩 PESAN MASUK");
    console.log(msg);

    // ================================================================
    // 2. RESOLVE CONTACT
    //    - Jika @lid → resolve
    //    - Jika @c.us → fast-path
    // ================================================================
    let resolved = null;
    try {
        resolved = await resolveContact(client, remote);
    } catch (_) {}

    const finalJid = sanitizeJid(resolved?.id) || normalizeJid(remote);

    // ================================================================
    // 3. FILTER GRUP SETELAH RESOLVE
    //    - Jika finalJid @g.us → skip
    // ================================================================
    if (!finalJid || finalJid.endsWith('@g.us')) {
        console.log("Ignored group message or unresolved -> skip");
        return;
    }

    const number = resolved?.number || finalJid.replace("@c.us", "");
    const text = (msg.body || '').trim();

    console.log("→ JID:", finalJid, "Num:", number, "Text:", text);

    // ================================================================
    // 4. COOLDOWN — Anti spam ban (WA 2025)
    // ================================================================
    const now = Date.now();
    const last = messageCooldown.get(finalJid);
    const cooldown = 1500 + Math.random() * 1200;
    if (last && now - last < cooldown) {
        console.log(`Cooldown ${now - last} < ${cooldown} → skip`);
        return;
    }
    messageCooldown.set(finalJid, now);

    // ================================================================
    // 5. LOCK → cegah double handler
    // ================================================================
    if (typingLocks.get(finalJid)) {
        console.log("Handler lock active → skip");
        return;
    }
    typingLocks.set(finalJid, true);

    try {
        // ================================================================
        // 6. CEK pesan terlambat + ambil dataPengirim
        // ================================================================
        const { delayed, dataPengirim } = await handleDelayedMessage(msg, messageService);

        if (delayed) return; // pesan terlambat sudah di-handle
        if (!dataPengirim) {
            console.log(`❌ Nomor +${number} tidak terdaftar → abaikan pesan`);
            return;
        }

        console.log(`✔ Nomor +${number} terdaftar di Pengirim: Reseller ${dataPengirim.nama} (${dataPengirim.kode_reseller})`);

        // ================================================================
        // 7. BUAT ID pengirim untuk reply
        // ================================================================
        const idPesan = msg?.id?.id;
        const idPengirim = idPesan
            ? `${number}@${config.AKHIRAN_WHATSAPP_KE_OUTBOX}#${idPesan}`
            : `${number}@${config.AKHIRAN_WHATSAPP_KE_OUTBOX}`;

        // ================================================================
        // 8. INSERT INBOX
        // ================================================================
        await insertInbox({
            kodeReseller: dataPengirim.kode_reseller,
            pengirim: idPengirim,
            pesan: text
        });
        console.log("✔ INSERT inbox berhasil:", idPengirim);

        // ================================================================
        // 9. REACT 👍 sebagai tanda "pesan diproses"
        // ================================================================
        if (messageService?.sendReaction) {
            messageService.sendReaction(msg, "👍");
        }

       

    } catch (err) {
        console.log("❌ Handler error:", err.message);
    } finally {
        typingLocks.delete(finalJid);
        console.log("✔ Handler selesai:", finalJid);
        console.log("──────────────────────────────────────────────\n");
    }
}

module.exports = { enhancedMessageHandler };
