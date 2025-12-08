// src/utils/contactResolver.js
// Maximum Safety Mode – Fully LID-Compatible, Zero-Crash Resolver
// + LID Logger untuk debugging & tracking
// WhatsApp-web.js 2025 latest compatible

const contactCache = new Map();

// Normalize raw input (e.g: "628xx" → "628xx@c.us")
function normalizeJid(jid) {
    if (!jid) return "";
    if (jid.includes("@")) return jid;
    return `${jid}@c.us`;
}

// Minimal fallback object jika resolver gagal
function fallbackContact(jid) {
    return {
        id: { _serialized: jid },
        number: jid.split("@")[0],
        pushname: null,
        name: null
    };
}

module.exports = async function resolveContact(client, rawJid) {
    try {
        let originalJid = rawJid;
        let jid = normalizeJid(rawJid);

        // ──────────────────────────────────────────────
        // 1. GROUP / BROADCAST (singkat & aman)
        // ──────────────────────────────────────────────
        if (jid.endsWith("@g.us") || jid.endsWith("@broadcast")) {
            return fallbackContact(jid);
        }

        // ──────────────────────────────────────────────
        // 2. LID Handler
        // ──────────────────────────────────────────────
        const isLid = jid.includes("@lid") || jid.includes("@s.whatsapp.net");

        if (isLid) {
            try {
                const res = await client.getContactLidAndPhone([jid]);

                // result example:
                // [{ lid: "...@lid", pn: "628123456789" }]
                if (res && res[0] && res[0].pn) {
                    const number = res[0].pn;
                    const newJid = `${number}@c.us`;

                    // ──────────────────────────────
                    // LOGGER: tampilkan konversi LID ➜ nomor@c.us
                    // ──────────────────────────────
                    console.log(`🔄 LID-RESOLVE: ${originalJid}  →  ${newJid}`);

                    jid = newJid;
                } else {
                    console.warn("⚠️ LID resolve returned no phone number for:", jid);
                }
            } catch (err) {
                console.warn("⚠️ LID resolve error:", err.message);
            }
        }

        // ──────────────────────────────────────────────
        // 3. CACHE – WAJIB agar tidak spam server WA
        // ──────────────────────────────────────────────
        if (contactCache.has(jid)) {
            return contactCache.get(jid);
        }

        // ──────────────────────────────────────────────
        // 4. Ambil contact lewat wwebjs (bisa gagal)
        // ──────────────────────────────────────────────
        let contact = null;

        try {
            contact = await client.getContactById(jid);
        } catch {
            // WA sering menolak JID baru → fallback
        }

        // ──────────────────────────────────────────────
        // 5. Jika gagal → fallback aman
        // ──────────────────────────────────────────────
        if (!contact) {
            contact = fallbackContact(jid);
        } else {
            // FIX: beberapa LID contact tidak punya number
            if (!contact.number) {
                contact.number = contact.id._serialized.split("@")[0];
            }
        }

        // ──────────────────────────────────────────────
        // 6. Simpan cache
        // ──────────────────────────────────────────────
        contactCache.set(jid, contact);

        return contact;

    } catch (err) {
        console.error("❌ resolveContact FATAL:", err);
        return fallbackContact(rawJid);
    }
};
