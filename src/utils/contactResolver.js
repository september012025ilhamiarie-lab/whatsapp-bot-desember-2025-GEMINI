// ====================================================================
// CONTACT RESOLVER – FINAL 2025
// Fully LID compatible + Safe getContactLidAndPhone()
// Persistent Disk Cache + Sanitized JID + Fallback Contact
// Compatible with whatsapp-web.js 2025
// ====================================================================

const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "../../data/contactCache.json");

// Internal in-memory cache
let cache = {
    pnByLid: {},        // LID → phone JID (c.us)
    lidByPn: {},        // phone JID → LID
    contactByPn: {}     // phone JID → contact object
};

// ====================================================================
// LOAD CACHE ON STARTUP
// ====================================================================
(function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const raw = fs.readFileSync(CACHE_FILE, "utf8");
            cache = JSON.parse(raw);
            console.info("📂 Contact Cache Loaded:", CACHE_FILE);
        } else {
            console.info("📂 No cache found — starting fresh");
        }
    } catch (e) {
        console.error("⚠️ Failed to load contact cache:", e.message);
    }
})();

// ====================================================================
// SAVE CACHE
// ====================================================================
function flushCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        console.info("💾 Contact Cache Saved:", CACHE_FILE);
    } catch (e) {
        console.error("⚠️ Failed to save cache:", e.message);
    }
}

// ====================================================================
// SANITIZE JID to xxx@c.us (never LID)
// ====================================================================
function sanitizeJid(jid) {
    if (!jid) return null;

    const raw = typeof jid === "string" ? jid : jid._serialized;
    const num = raw.split("@")[0].replace(/[^0-9]/g, "");

    return num + "@c.us";
}

// ====================================================================
// FALLBACK CONTACT (if WA server fetch fails)
// ====================================================================
function fallbackContact(jid) {
    console.warn(`⚠️ Using fallback contact: ${jid}`);
    return {
        id: { _serialized: jid },
        number: jid.split("@")[0],
        pushname: null,
        name: null
    };
}

// ====================================================================
// MAIN RESOLVER
// ====================================================================
async function resolveContact(client, rawJid) {
    console.info(`\n🔍 resolveContact() → rawJid: ${rawJid}`);

    try {
        // Normalize to JID
        let jid = rawJid.includes("@") ? rawJid : rawJid + "@c.us";
        jid = jid.toLowerCase();

        console.info(`➡️ Normalized JID: ${jid}`);

        // Skip group / broadcast / newsletter
        if (
            jid.endsWith("@g.us") ||
            jid.endsWith("@broadcast") ||
            jid.endsWith("@newsletter")
        ) {
            console.info("🔸 Skipping resolver (group/broadcast/newsletter)");
            return fallbackContact(jid);
        }

        // ============================================================
        // 1. LID → phone JID resolution
        // ============================================================
        const isLid =
            jid.includes("@lid") ||
            jid.includes("@s.whatsapp.net") ||
            jid.match(/[0-9]+:[0-9]+@/);

        if (isLid) {
            console.info("🔍 JID is LID:", jid);

            // check cache
            if (cache.pnByLid[jid]) {
                const pn = cache.pnByLid[jid];
                console.info(`✔️ LID cache hit → ${jid} → ${pn}`);
                jid = pn;
            } else {
                console.info("🌐 Resolving LID from WA server...");

                try {
                    const res = await client.getContactLidAndPhone([jid]);
                    const info = res?.[0];

                    console.info("📥 LID Resolver Response:", info);

                    if (info?.pn) {
                        // pn always xxx@c.us
                        cache.pnByLid[jid] = info.pn;
                        cache.lidByPn[info.pn] = jid;

                        flushCache();

                        console.info(`🔄 LID resolved → ${jid} → ${info.pn}`);
                        jid = info.pn;
                    } else {
                        console.warn("⚠️ LID resolved but phone missing");
                    }
                } catch (e) {
                    console.warn("⚠️ LID resolver failed:", e.message);
                }
            }
        }

        // force sanitize
        const pn = sanitizeJid(jid);
        console.info(`➡️ Final PN = ${pn}`);

        // ============================================================
        // 2. Check contact cache
        // ============================================================
        if (cache.contactByPn[pn]) {
            console.info(`📌 Contact cache hit for ${pn}`);
            return cache.contactByPn[pn];
        }

        // ============================================================
        // 3. Fetch from WA server
        // ============================================================
        console.info("🌐 Fetching contact from WA server...");

        let contact = null;

        try {
            contact = await client.getContactById(pn);
            console.info(
                "📥 WA Contact:",
                contact?.pushname || contact?.number || "OK"
            );
        } catch (e) {
            console.warn("⚠️ WA fetch error:", e.message);
        }

        if (!contact) {
            console.warn("⚠️ WA fetch failed → using fallback");
            contact = fallbackContact(pn);
        }

        // ensure metadata exists
        if (!contact.number) {
            contact.number = pn.split("@")[0];
        }

        // save to cache
        cache.contactByPn[pn] = contact;
        flushCache();

        console.info(`💾 Saved contact to cache: ${pn}`);

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
