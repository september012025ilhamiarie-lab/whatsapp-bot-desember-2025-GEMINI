/**
 * CONTACT RESOLVER – Persistent JSON Edition 2025
 * Full LID compatible + anti-spam getContactLidAndPhone
 * Auto cache to disk + verbose logging (console.info)
 */

const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "../../data/contactCache.json");

let cache = {
    pnByLid: {},         // "xxxxx@lid" → "628xxx@c.us"
    lidByPn: {},         // "628xxx@c.us" → "xxxxx@lid"
    contactByPn: {}      // "628xxx@c.us" → contact object (wwebjs)
};

// ─────────────────────────────────────
//  Load Cache from JSON
// ─────────────────────────────────────
(function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, "utf8");
            cache = JSON.parse(raw);
            console.info("📂 Contact Cache loaded:", CACHE_FILE);
        } else {
            console.info("📂 No existing contact cache file, starting fresh");
        }
    } catch (err) {
        console.error("⚠️ Failed to load cache:", err.message);
    }
})();

// ─────────────────────────────────────
//  Save Cache to Disk
// ─────────────────────────────────────
function flushCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.info("💾 Contact Cache saved:", CACHE_FILE);
    } catch (err) {
        console.error("⚠️ Failed to save cache:", err.message);
    }
}

// ─────────────────────────────────────
//  sanitize JID
// ─────────────────────────────────────
function sanitizeJid(jid) {
    if (!jid) return null;
    const raw = typeof jid === "string" ? jid : jid._serialized;
    return raw.replace(/[@:].*$/, "") + "@c.us";
}

// ─────────────────────────────────────
//  fallback contact
// ─────────────────────────────────────
function fallbackContact(jid) {
    console.info(`⚠️ Returning Fallback Contact for ${jid}`);
    return {
        id: { _serialized: jid },
        number: jid.split("@")[0],
        pushname: null,
        name: null
    };
}

// ─────────────────────────────────────
//  MAIN — resolveContact()
// ─────────────────────────────────────
async function resolveContact(client, rawJid) {
    console.info(`\n🔍 resolveContact() called → rawJid = ${rawJid}`);
    
    try {
        let jid = rawJid.includes("@") ? rawJid : rawJid + "@c.us";
        console.info(`➡️ Normalized jid = ${jid}`);

        // Group / broadcast
        if (jid.endsWith("@g.us") || jid.endsWith("@broadcast")|| jid.endsWith("@newsletter")) {
            console.info("🔸 Group/Broadcast/newsletter detected → skipping resolver");
            return fallbackContact(jid);
        }

        // ────────────────────────
        // 1. LID → PN resolution
        // ────────────────────────
        const isLid = jid.includes("@lid") || jid.includes("@s.whatsapp.net");

        if (isLid) {
            console.info("🔍 JID is LID type:", jid);

            if (cache.pnByLid[jid]) {
                console.info(`✔️ LID found in cache: ${jid} → ${cache.pnByLid[jid]}`);
                jid = cache.pnByLid[jid];
            } else {
                console.info("🌐 Resolving LID via WhatsApp getContactLidAndPhone()");
                try {
                    const res = await client.getContactLidAndPhone([jid]);

                    console.info("📥 Result from WA:", res);

                    if (res && res[0] && res[0].pn) {
                        const pn = res[0].pn;
                        cache.pnByLid[jid] = pn;
                        cache.lidByPn[pn] = jid;
                        flushCache();
                        console.info(`🔄 LID resolved ${jid} → ${pn}`);
                        jid = pn;
                    } else {
                        console.warn("⚠️ LID resolved but phone not detected");
                    }
                } catch (err) {
                    console.warn("⚠️ LID Resolver error:", err.message);
                }
            }
        }

        const pn = sanitizeJid(jid);
        console.info(`➡️ Final PN processed = ${pn}`);

        // ────────────────────────
        // 2. Contact cache check
        // ────────────────────────
        if (cache.contactByPn[pn]) {
            console.info(`📌 Contact found in cache for ${pn}`);
            return cache.contactByPn[pn];
        }

        // ────────────────────────
        // 3. Fetch via wwebjs
        // ────────────────────────
        console.info("🌐 Fetching contact via WhatsApp API (1st time)");
        let contact = null;

        // try safe metadata load (ignore errors)
        try { await client.isRegisteredUser(wid); } catch {}
        try { await client.getProfilePicUrl(wid); } catch {}


        try {
            contact = await client.getContactById(pn);
            console.info("📥 Contact from WA:", contact?.number || contact?.pushname || "OK (no extra details)");
        } catch (err) {
            console.warn("⚠️ Failed to fetch contact from WA:", err.message);
        }

        if (!contact) {
            console.warn("⚠️ Fetch failed → using fallback contact");
            contact = fallbackContact(pn);
        }

        if (!contact.number) {
            contact.number = pn.split("@")[0];
        }

        // store contact permanently
        cache.contactByPn[pn] = contact;
        flushCache();
        console.info(`💾 Contact saved to cache for ${pn}`);

        return contact;

    } catch (err) {
        console.error("❌ resolveContact FATAL:", err);
        return fallbackContact(rawJid);
    }
}

module.exports = {
    resolveContact,
    sanitizeJid
};
