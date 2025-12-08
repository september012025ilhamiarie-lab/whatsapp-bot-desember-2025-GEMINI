// src/utils/presenceLoop.js
const { humanDelay, sleep, jitter } = require('./humanHelpers');

async function autoPresenceLoop(client) {
    console.log("Starting Safe Presence Loop...");
    
    while (true) {
        try {
            // 1. Random chance to appear online (20%)
            if (Math.random() < 0.20) {
                try {
                    await client.sendPresenceAvailable();
                } catch {}
            }
            
            // 2. Random chance to appear offline (40%)
            else if (Math.random() < 0.60) {
                try {
                    await client.sendPresenceUnavailable();
                } catch {}
            }

            // 3. Very rare composing event (only 5%)
            else if (Math.random() < 0.05) {
                try {
                    // Pick a recent chat instead of random chat
                    const chats = await client.getChats();
                    const recent = chats
                        .filter(c => !c.isGroup && !c.isMuted)
                        .slice(0, 5); // only latest chats

                    if (recent.length > 0) {
                        const pick = recent[Math.floor(Math.random() * recent.length)];

                        await client.sendPresenceUpdate("composing", pick.id._serialized);
                        await sleep(jitter(500, 1500));
                        await client.sendPresenceUpdate("paused", pick.id._serialized);
                    }
                } catch {}
            }

            // 4. Large idle interval (human-like)
            const idle = jitter(90000, 280000); // 1.5 — 4.5 minutes
            await sleep(idle);

        } catch (err) {
            console.error("presenceLoop error:", err.message);
            await sleep(10000);
        }
    }
}

module.exports = autoPresenceLoop;
