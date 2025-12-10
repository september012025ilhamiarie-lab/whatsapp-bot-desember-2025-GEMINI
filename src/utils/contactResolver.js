// src/utils/contactResolver.js
// CONTACT RESOLVER — FINAL 2025
// - Robust LID -> phone resolution
// - Debounced disk cache with TTL
// - Serial queued WA fetches to avoid rate limits
// - Verbose logging toggle via env CONTACT_RESOLVE_VERBOSE

const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "../../data/contactCache.json");
const VERBOSE = String(process.env.CONTACT_RESOLVE_VERBOSE || "true").toLowerCase() === "true";

// TTL for cached contact entries (ms) — default 7 days
const CONTACT_TTL_MS = Number(process.env.CONTACT_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

// Debounce delay for writing cache to disk (ms)
const CACHE_FLUSH_DEBOUNCE_MS = Number(process.env.CONTACT_CACHE_FLUSH_MS) || 500;

// In-memory cache shape:
// {
//   pnByLid: { "<lid>": "628xxx@c.us" },
//   lidByPn: { "628xxx@c.us": "<lid>" },
//   contactByPn: { "628xxx@c.us": { data: <contactObj>, ts: <timestamp> } }
// }
let cache = {
  pnByLid: {},
  lidByPn: {},
  contactByPn: {}
};

// --- util logging helpers ---
function log(...args) { if (VERBOSE) console.info("[contactResolver]", ...args); }
function warn(...args) { console.warn("[contactResolver]", ...args); }
function errlog(...args) { console.error("[contactResolver]", ...args); }

// --- load cache safely on startup ---
(function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf8");
      try {
        cache = JSON.parse(raw);
        // ensure shapes exist
        cache.pnByLid = cache.pnByLid || {};
        cache.lidByPn = cache.lidByPn || {};
        cache.contactByPn = cache.contactByPn || {};
        log("📂 Contact Cache loaded:", CACHE_FILE);
      } catch (e) {
        warn("⚠️ Contact cache corrupt or invalid JSON. Auto-resetting cache.");
        cache = { pnByLid: {}, lidByPn: {}, contactByPn: {} };
        safeFlushCache(); // will create file
      }
    } else {
      log("📂 No contact cache file — starting fresh");
      // ensure folder exists
      try { fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); } catch (e) {}
      safeFlushCache();
    }
  } catch (e) {
    errlog("Failed to load contact cache:", e.message || e);
  }
})();

// --- debounced flush to disk ---
let _flushTimeout = null;
let _flushLock = false;
function flushCacheSync() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    log("💾 Contact Cache written to disk:", CACHE_FILE);
  } catch (e) {
    errlog("Failed to write contact cache:", e.message || e);
  }
}
function safeFlushCache() {
  if (_flushTimeout) clearTimeout(_flushTimeout);
  _flushTimeout = setTimeout(() => {
    if (_flushLock) return;
    _flushLock = true;
    try {
      flushCacheSync();
    } finally {
      _flushLock = false;
    }
  }, CACHE_FLUSH_DEBOUNCE_MS);
}

// --- simple TTL cleanup for contact entries (called opportunistically) ---
function purgeExpiredContacts() {
  try {
    const now = Date.now();
    let removed = 0;
    for (const pn of Object.keys(cache.contactByPn)) {
      const entry = cache.contactByPn[pn];
      if (!entry || !entry.ts) {
        delete cache.contactByPn[pn];
        removed++;
        continue;
      }
      if (now - entry.ts > CONTACT_TTL_MS) {
        delete cache.contactByPn[pn];
        removed++;
      }
    }
    if (removed > 0) {
      log(`🧹 Purged ${removed} expired contact cache entries`);
      safeFlushCache();
    }
  } catch (e) {
    warn("purgeExpiredContacts error:", e.message || e);
  }
}

// --- sanitizeJid: ensure returns valid 'number@c.us' or null ---
function sanitizeJid(jid) {
  if (!jid) return null;
  try {
    const raw = typeof jid === "string" ? jid : (jid?._serialized || String(jid));
    // remove whitespace and lowercase
    let s = String(raw).trim().toLowerCase();

    // remove any trailing metadata after ':' (sometimes appears)
    if (s.includes(":")) s = s.split(":")[0];

    // if it's lid-like with a trailing part, keep full for detection; we'll extract digits later
    // extract digits for phone-like returns
    const digits = s.split("@")[0].replace(/\D/g, "");
    if (!digits || digits.length < 6) return null;

    return `${digits}@c.us`;
  } catch (e) {
    warn("sanitizeJid error:", e.message || e);
    return null;
  }
}

// --- fallbackContact: minimal contact object if WA fetch fails ---
function fallbackContact(jid) {
  if (!jid) return null;
  log("⚠️ Using fallback contact for", jid);
  const num = (jid.split && jid.split("@")[0]) || jid;
  return {
    id: { _serialized: jid },
    number: num,
    pushname: null,
    name: null
  };
}

// --- internal queued fetch to avoid concurrent / burst WA calls ---
// simple serial queue implemented by chaining promises
let contactQueue = Promise.resolve();
function queuedFetch(fn) {
  // push onto chain and return promise that resolves when fn() completes
  contactQueue = contactQueue.then(() => {
    // small gap between requests to be extra gentle
    return new Promise((resolve) => {
      setTimeout(resolve, 40);
    }).then(() => fn());
  }).catch((e) => {
    // swallow to keep chain alive
    warn("queuedFetch error (swallowed):", e?.message || e);
    return null;
  });
  return contactQueue;
}

// --- subscribers for onResolved hooks (optional) ---
const _resolvedCallbacks = [];
function onResolved(cb) {
  if (typeof cb === "function") _resolvedCallbacks.push(cb);
}

// call hooks safely
function emitResolved(pn, contactObj) {
  try {
    for (const cb of _resolvedCallbacks) {
      try { cb(pn, contactObj); } catch (e) { warn("onResolved callback error:", e?.message || e); }
    }
  } catch (e) { /* ignore */ }
}

// --- helpers to detect LID-like inputs ---
function looksLikeLid(s) {
  if (!s) return false;
  const st = String(s);
  return /@lid|@s\.whatsapp\.net|[0-9]+:[0-9]+@|:.+@/.test(st) || /[a-f0-9]{8}\-[a-f0-9]{4}/i.test(st);
}

// --- main resolveContact function ---
async function resolveContact(client, rawJid) {
  log(`\n🔍 resolveContact() called → rawJid = ${rawJid}`);

  try {
    // quick purge occasionally
    purgeExpiredContacts();

    // normalize to lower-case string
    let jid = typeof rawJid === "string" ? rawJid : (rawJid && rawJid._serialized) || String(rawJid || "");

    if (!jid) {
      warn("resolveContact: invalid rawJid");
      return fallbackContact(rawJid);
    }

    jid = jid.trim();

    // If it's group / broadcast / newsletter: return fallback (no phone)
    const lower = jid.toLowerCase();
    if (lower.endsWith("@g.us") || lower.endsWith("@broadcast") || lower.endsWith("@newsletter")) {
      log("resolveContact: group/broadcast/newsletter detected -> returning fallback");
      return fallbackContact(jid);
    }

    // If it's already phone@c.us (or contains phone digits) try fast-path sanitize
    if (!looksLikeLid(jid) && /@c\.us$/.test(jid.toLowerCase())) {
      const pn = sanitizeJid(jid);
      if (!pn) return fallbackContact(jid);

      // cached contact?
      const cached = cache.contactByPn[pn];
      if (cached && (Date.now() - (cached.ts || 0) < CONTACT_TTL_MS)) {
        log("✔️ Direct PN cache hit:", pn);
        emitResolved(pn, cached.data);
        return cached.data;
      }

      // fetch via queued WA call
      const contact = await queuedFetch(async () => {
        try {
          const c = await client.getContactById(pn);
          if (c) {
            log("📥 Fetched contact from WA:", pn);
            const entry = { data: c, ts: Date.now() };
            cache.contactByPn[pn] = entry;
            safeFlushCache();
            emitResolved(pn, c);
            return c;
          }
        } catch (e) {
          warn("getContactById failed:", e?.message || e);
        }
        // fallback
        const fb = fallbackContact(pn);
        cache.contactByPn[pn] = { data: fb, ts: Date.now() };
        safeFlushCache();
        emitResolved(pn, fb);
        return fb;
      });

      return contact;
    }

    // LID-ish resolution flow
    // try to resolve LID -> pn via cache first
    if (looksLikeLid(jid)) {
      log("🔍 LID detected:", jid);

      if (cache.pnByLid[jid]) {
        const cachedPn = cache.pnByLid[jid];
        log("✔️ pnByLid cache hit:", jid, "→", cachedPn);

        // ensure contact cache exists too
        const contactEntry = cache.contactByPn[cachedPn];
        if (contactEntry && (Date.now() - contactEntry.ts < CONTACT_TTL_MS)) {
          emitResolved(cachedPn, contactEntry.data);
          return contactEntry.data;
        }

        // otherwise treat pn as resolved and fetch contact
        const pn = sanitizeJid(cachedPn);
        if (!pn) {
          warn("pnByLid cache entry invalid:", cachedPn);
        } else {
          // fetch contact (queued)
          const contact = await queuedFetch(async () => {
            try {
              const c = await client.getContactById(pn);
              if (c) {
                cache.contactByPn[pn] = { data: c, ts: Date.now() };
                safeFlushCache();
                emitResolved(pn, c);
                return c;
              }
            } catch (e) {
              warn("getContactById in pnByLid path failed:", e?.message || e);
            }
            const fb = fallbackContact(pn);
            cache.contactByPn[pn] = { data: fb, ts: Date.now() };
            safeFlushCache();
            emitResolved(pn, fb);
            return fb;
          });

          return contact;
        }
      }

      // if not cached, attempt client.getContactLidAndPhone()
      log("🌐 Resolving LID via client.getContactLidAndPhone() ...");
      try {
        // call WA; some WA servers require array input
        const res = await client.getContactLidAndPhone([jid]);
        const info = res && res[0] ? res[0] : null;
        log("📥 getContactLidAndPhone response:", info);

        if (info && info.pn) {
          const pn = sanitizeJid(info.pn);
          if (pn) {
            // update caches
            cache.pnByLid[jid] = pn;
            cache.lidByPn[pn] = jid;
            safeFlushCache();
            log(`🔄 LID resolved ${jid} → ${pn}`);

            // fetch contact by pn (queued)
            const contact = await queuedFetch(async () => {
              try {
                const c = await client.getContactById(pn);
                if (c) {
                  cache.contactByPn[pn] = { data: c, ts: Date.now() };
                  safeFlushCache();
                  emitResolved(pn, c);
                  return c;
                }
              } catch (e) {
                warn("getContactById after LID resolve failed:", e?.message || e);
              }
              const fb = fallbackContact(pn);
              cache.contactByPn[pn] = { data: fb, ts: Date.now() };
              safeFlushCache();
              emitResolved(pn, fb);
              return fb;
            });

            return contact;
          } else {
            warn("Resolved pn invalid after sanitize:", info.pn);
          }
        } else {
          warn("getContactLidAndPhone did not return pn (or WA returned null)");
        }
      } catch (e) {
        warn("getContactLidAndPhone failed:", e?.message || e);
      }

      // if all LID attempts fail, fallback to sanitize digits from LID and return fallback
      const fallbackPn = sanitizeJid(jid);
      if (fallbackPn) {
        log("⚠️ LID -> sanitized fallback PN:", fallbackPn);
        const fb = fallbackContact(fallbackPn);
        cache.contactByPn[fallbackPn] = { data: fb, ts: Date.now() };
        safeFlushCache();
        emitResolved(fallbackPn, fb);
        return fb;
      }

      // last resort
      return fallbackContact(jid);
    }

    // final fallback: try sanitize anything else
    const pnFinal = sanitizeJid(jid);
    if (pnFinal) {
      // reuse direct PN path (fetch if not cached)
      const cachedEntry = cache.contactByPn[pnFinal];
      if (cachedEntry && (Date.now() - cachedEntry.ts < CONTACT_TTL_MS)) {
        emitResolved(pnFinal, cachedEntry.data);
        return cachedEntry.data;
      }
      const contact = await queuedFetch(async () => {
        try {
          const c = await client.getContactById(pnFinal);
          if (c) {
            cache.contactByPn[pnFinal] = { data: c, ts: Date.now() };
            safeFlushCache();
            emitResolved(pnFinal, c);
            return c;
          }
        } catch (e) {
          warn("getContactById fallback failed:", e?.message || e);
        }
        const fb = fallbackContact(pnFinal);
        cache.contactByPn[pnFinal] = { data: fb, ts: Date.now() };
        safeFlushCache();
        emitResolved(pnFinal, fb);
        return fb;
      });
      return contact;
    }

    // nothing else — return fallback
    return fallbackContact(jid);

  } catch (err) {
    errlog("resolveContact FATAL:", err?.message || err);
    return fallbackContact(rawJid);
  }
}

// --- small helper: expose cache for debug (read-only clone) ---
function getCacheSnapshot() {
  try {
    return JSON.parse(JSON.stringify(cache));
  } catch (e) {
    return { pnByLid: {}, lidByPn: {}, contactByPn: {} };
  }
}

// --- export API ---
module.exports = {
  resolveContact,
  sanitizeJid,
  onResolved,
  getCacheSnapshot
};
