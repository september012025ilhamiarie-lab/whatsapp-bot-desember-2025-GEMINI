// ====================================================================
// presenceLoop.js — FINAL 2025 VERSION (Safe, Anti-ban, Low CPU)
// src/utils/presenceLoop.js
// ====================================================================

const { sleep, jitter } = require('./humanHelpers');

/**
 * Auto Presence Simulation Loop
 * - Human behavior model: sometimes online, mostly offline,
 *   rare typing simulation, long idle periods.
 * - Runs forever in a safe low-frequency pattern.
 * - This keeps bot behavior natural and reduces ban-risk.
 */
async function autoPresenceLoop(client) {
    console.log("📡 Presence Loop Started (Safe Mode)...");

    while (true) {
        try {
            const roll = Math.random();

            // -------------------------------------------------------
            // 1. 15% chance → ONLINE status
            // -------------------------------------------------------
            if (roll < 0.15) {
                try {
                    console.log("👤 presence: ONLINE");
                    await client.sendPresenceAvailable();
                } catch (err) {
                    console.warn("⚠️ presenceAvailable error:", err.message);
                }
            }

            // -------------------------------------------------------
            // 2. 50% chance → OFFLINE status
            // -------------------------------------------------------
            else if (roll < 0.65) {
                try {
                    console.log("👤 presence: OFFLINE");
                    await client.sendPresenceUnavailable();
                } catch (err) {
                    console.warn("⚠️ presenceUnavailable error:", err.message);
                }
            }

            // -------------------------------------------------------
            // 3. 3% chance → simulate typing ("composing")
            // -------------------------------------------------------
            else if (roll < 0.68) {
                try {
                    const chats = await client.getChats();

                    // Only recent chats (not all)
                    const recent = chats
                        .filter(c => !c.isGroup)
                        .slice(0, 6);

                    if (recent.length > 0) {
                        const pick = recent[Math.floor(Math.random() * recent.length)];

                        console.log(`⌨️ presence: typing in ${pick.name || pick.id._serialized}`);

                        await client.sendPresenceUpdate("composing", pick.id._serialized);
                        await sleep(jitter(600, 1900));
                        await client.sendPresenceUpdate("paused", pick.id._serialized);
                    }

                } catch (err) {
                    console.warn("⚠️ typing simulation error:", err.message);
                }
            }

            // -------------------------------------------------------
            // 4. 32% chance → do nothing (idle)
            // -------------------------------------------------------

            // -------------------------------------------------------
            // 5. Idle delay between 1.7 – 4.8 minutes
            // -------------------------------------------------------
            const idle = jitter(100000, 290000);
            await sleep(idle);

        } catch (fatal) {
            console.error("❌ presenceLoop fatal:", fatal.message);

            // Anti-crash delay
            await sleep(15000);
        }
    }
}

module.exports = autoPresenceLoop;
