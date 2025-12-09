// src/handlers/messageHandler.js
// ====================================================================
// MESSAGE HANDLER — FINAL 2025 EDITION
// - Enhanced + Legacy handlers
// - LID resolver, anti-ban behaviour, detailed logs
// ====================================================================

const { resolveContact, sanitizeJid } = require('../utils/contactResolver');
const { humanDelay, simulateTyping } = require('../utils/humanHelpers');
const config = require('../core/config');

// runtime maps
const messageCooldown = new Map();   // per JID anti-spam
const typingLocks = new Map();       // per JID typing lock

// --------------------------------------------------------------------
// Helper: normalize/ensure JID to usable form (xxx@c.us or group @g.us)
// --------------------------------------------------------------------
function normalizeToChatJid(raw) {
    if (!raw) return null;
    const s = String(raw).toLowerCase();

    // already a normal chat JID
    if (s.endsWith('@c.us') || s.endsWith('@g.us')) return s;

    // LID-ish → extract digits and return as @c.us
    const num = s.split('@')[0].replace(/\D/g, '');
    if (num.length >= 6) return `${num}@c.us`;

    // fallback
    return s;
}

// --------------------------------------------------------------------
// Legacy handler (keamanan backward-compatibility).
// Keep minimal but useful logging; won't auto-save unless messageService provided.
// --------------------------------------------------------------------
async function legacyMessageHandler(client, msg, messageService = null) {
    try {
        console.info('\n[LEGACY HANDLER] Triggered for', msg.from);

        // Basic filters (same as enhanced)
        if (!msg || !msg.from) return;
        const remote = msg?.id?.remote || msg.from || '';
        if (!remote.endsWith('@c.us') && !remote.endsWith('@g.us') && !remote.endsWith('@lid')) {
            console.warn('[LEGACY] Ignored non-chat remote:', remote);
            return;
        }

        // Resolve contact (handle @lid)
        let resolved;
        try {
            resolved = await resolveContact(client, msg.from);
            console.info('[LEGACY] resolveContact ->', resolved?.id?._serialized || 'none');
        } catch (e) {
            console.warn('[LEGACY] resolveContact failed:', e?.message || e);
        }

        const jid = sanitizeJid(resolved?.id || msg.from) || normalizeToChatJid(msg.from);
        const text = msg.body?.trim() || '';

        console.info(`[LEGACY] JID=${jid} text="${text}"`);

        // Optional: persist inbox if messageService provides saveInbox()
        if (messageService && typeof messageService.saveInbox === 'function') {
            try {
                console.info('[LEGACY] Saving to inbox via messageService.saveInbox()');
                await messageService.saveInbox(jid, text, msg);
                // react if possible
                if (typeof messageService.sendReaction === 'function') {
                    messageService.sendReaction(msg, '👍');
                } else if (typeof msg.react === 'function') {
                    try { await msg.react('👍'); } catch {}
                }
                console.info('[LEGACY] saved -> reacted thumbs up');
            } catch (e) {
                console.warn('[LEGACY] saveInbox failed:', e?.message || e);
            }
        }

        // Minimal auto-reply (safe) — only if explicitly available on messageService
        if (messageService && typeof messageService.sendText === 'function') {
            // Example: short ack
            try {
                await humanDelay(400, 1000);
                // simulate short typing but only if simulateTyping available
                try { await simulateTyping(client, jid, 'Sedang membalas...'); } catch {}
                messageService.sendText(jid, 'Terima kasih, pesan Anda sudah kami terima.');
            } catch (e) {
                console.warn('[LEGACY] auto-reply failed:', e?.message || e);
            }
        }

    } catch (err) {
        console.error('[LEGACY] handler error:', err);
    }
}

// --------------------------------------------------------------------
// ENHANCED handler — final production-grade message handler
// - call with (client, msg, messageService)
// --------------------------------------------------------------------
async function enhancedMessageHandler(client, msg, messageService, options = {}) {
    console.info('\n────────────────────────────────────────────────────');
    console.info('📩 ENHANCED MESSAGE HANDLER TRIGGERED');

    // quick raw dump for debug — keep it concise in prod if noisy
    console.debug('RAW MESSAGE:', msg && { id: msg?.id?._serialized, from: msg?.from, body: msg?.body, isStatus: msg?.isStatus });

    // Sanity
    if (!msg || !msg.from) {
        console.warn('[ENHANCED] invalid msg object, skipping.');
        return;
    }

    // Remote filter — ignore status/broadcast/newsletter etc.
    const remote = msg?.id?.remote || msg.from || '';
    console.info('[ENHANCED] remote:', remote);

    if (!remote.endsWith('@c.us') && !remote.endsWith('@g.us') && !remote.endsWith('@lid')) {
        console.warn('[ENHANCED] Ignored non-chat remote:', remote);
        return;
    }

    // Resolve contact (handles @lid -> @c.us)
    let resolved;
    try {
        resolved = await resolveContact(client, msg.from);
        console.info('[ENHANCED] resolveContact =>', resolved?.id?._serialized || 'fallback');
    } catch (e) {
        console.warn('[ENHANCED] resolveContact failed:', e?.message || e);
    }

    const jid = sanitizeJid(resolved?.id || msg.from) || normalizeToChatJid(msg.from);
    const number = (resolved && resolved.number) || jid.split('@')[0];
    const pushname = (resolved && resolved.pushname) || msg.notifyName || null;
    const isGroup = !!msg.isGroup;
    const text = (msg.body || '').toString().trim();

    console.info(`[ENHANCED] Processed: jid=${jid} number=${number} pushname=${pushname} isGroup=${isGroup}`);
    console.info(`[ENHANCED] Body: "${text}"`);

    // Anti-spam (per-jid) — randomized cooldown window
    const now = Date.now();
    const last = messageCooldown.get(jid);
    const baseMin = 1400, baseMax = 3000;
    const randomCooldown = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));

    if (last && now - last < randomCooldown) {
        console.info(`[ENHANCED] Cooldown active for ${jid} (${now - last}ms < ${randomCooldown}ms). Skipping.`);
        return;
    }
    messageCooldown.set(jid, now);

    // Typing lock (avoid double replies concurrently)
    if (typingLocks.get(jid)) {
        console.info('[ENHANCED] Typing lock active for', jid, '→ skipping to avoid double reply.');
        return;
    }

    // Choose antiBan helpers (from options or messageService or fallback)
    const antiBan = options.antiBan || messageService?.options?.antiBan || {
        humanDelay: async (min = 500, max = 1200) => { await new Promise(r => setTimeout(r, min + Math.random() * (max - min))); },
        simulateTyping: async () => {},
        sleep: async (ms) => new Promise(r => setTimeout(r, ms))
    };

    // short helper to safely simulate typing via provided helper or wwebjs fallback
    async function safeSimulateTypingHelper(clientRef, destJid, textSample = '') {
        try {
            if (typeof antiBan.simulateTyping === 'function') {
                await antiBan.simulateTyping(clientRef, destJid, textSample);
            } else {
                // best-effort fallback using client presence update
                try { await clientRef.sendPresenceAvailable(); } catch {}
                try { await clientRef.sendPresenceUpdate('composing', destJid); } catch {}
                await new Promise(r => setTimeout(r, Math.min(1000, (textSample?.length || 10) * 30)));
                try { await clientRef.sendPresenceUpdate('paused', destJid); } catch {}
            }
        } catch (e) {
            console.warn('[ENHANCED] safeSimulateTyping failed:', e?.message || e);
        }
    }

    try {
        // ignore group spam prefix
        if (isGroup && text.startsWith('.')) {
            console.warn('[ENHANCED] Ignored group spam prefix for', jid);
            return;
        }

        // lock typing for this JID
        typingLocks.set(jid, true);

        // --- Commands & matches (add more here) ---
        const tl = text.toLowerCase();

        // Command: !menu
        if (tl === '!menu') {
            console.info('[ENHANCED] Command !menu detected for', jid);

            await antiBan.humanDelay(350, 1200);
            await safeSimulateTypingHelper(client, jid, 'Sedang mengetik...');

            if (messageService && typeof messageService.sendText === 'function') {
                messageService.sendText(jid,
                    '📌 *Menu Bot*\n' +
                    '1. Status\n' +
                    '2. Bantuan\n' +
                    'Ketik nomor untuk pilihan.'
                );
                console.info('[ENHANCED] Sent !menu response via messageService');
            } else {
                // fallback raw send (best-effort)
                try {
                    await client.sendMessage(jid, '📌 Menu Bot\n1. Status\n2. Bantuan');
                    console.info('[ENHANCED] Sent !menu response via client.sendMessage (fallback)');
                } catch (e) {
                    console.warn('[ENHANCED] fallback send failed:', e?.message || e);
                }
            }

            return;
        }

        // Greeting fuzzy: hi / hai / halo / hali / holla etc. (simple fuzzy)
        if (/^(hi+|hai+|halo+|hallo+|hali|holla|hey+|helo+)\b/i.test(text)) {
            console.info('[ENHANCED] Greeting detected for', jid);

            await antiBan.humanDelay(400, 1000);
            await safeSimulateTypingHelper(client, jid, 'Halo…');

            if (messageService && typeof messageService.sendText === 'function') {
                messageService.sendText(jid, `Halo @${number} ${pushname ? `(${pushname})` : ''} 👋\nPesan kamu sudah diterima. Kami akan membalas secepatnya.`);
                console.info('[ENHANCED] Sent greeting reply via messageService');
            } else {
                try {
                    await client.sendMessage(jid, `Halo ${pushname || ''} 👋 Pesan kamu sudah diterima.`);
                    console.info('[ENHANCED] Sent greeting reply via client.sendMessage (fallback)');
                } catch (e) {
                    console.warn('[ENHANCED] fallback greeting send failed:', e?.message || e);
                }
            }

            // optional: save inbox (if messageService supports)
            if (messageService && typeof messageService.saveInbox === 'function') {
                try {
                    await messageService.saveInbox(jid, text, msg);
                    console.info('[ENHANCED] messageService.saveInbox succeeded');
                    // react via messageService if available
                    if (typeof messageService.sendReaction === 'function') {
                        messageService.sendReaction(msg, '👍');
                    } else if (typeof msg.react === 'function') {
                        try { await msg.react('👍'); } catch {}
                    }
                } catch (e) {
                    console.warn('[ENHANCED] saveInbox failed:', e?.message || e);
                }
            }

            return;
        }

        // If nothing matched → forward to legacy handler (safe fallback)
        console.info('[ENHANCED] No enhanced match — forwarding to legacy handler');
        await legacyMessageHandler(client, msg, messageService);

    } catch (err) {
        console.error('[ENHANCED] handler error:', err);
    } finally {
        // release lock
        typingLocks.delete(jid);
        console.info('[ENHANCED] completed for', jid);
        console.info('────────────────────────────────────────────────────\n');
    }
}

// --------------------------------------------------------------------
// export both handlers (WhatsAppBot can choose which to wire)
// --------------------------------------------------------------------
module.exports = {
    legacyMessageHandler,
    enhancedMessageHandler
};
