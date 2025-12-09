// ====================================================================
// presenceLoop.js — FINAL 2025 VERSION (Safe, Anti-ban, Low CPU)
// ====================================================================

const { sleep, jitter } = require('./humanHelpers');

async function autoPresenceLoop(client) {
    console.log("📡 Presence Loop Started (Safe Mode)...");

    while (true) {
        try {
            const roll = Math.random();

            // -------------------------------------------------------
            // 1. 15% chance: tampil ONLINE
            // -------------------------------------------------------
            if (roll < 0.15) {
                try {
                    await client.sendPresenceAvailable();
                } catch {}
            }

            // -------------------------------------------------------
            // 2. 50% chance: tampil OFFLINE (lebih realistis)
            // -------------------------------------------------------
            else if (roll < 0.65) {
                try {
                    await client.sendPresenceUnavailable();
                } catch {}
            }

            // -------------------------------------------------------
            // 3. 3% chance: "composing" sebentar pada recent chat
            // -------------------------------------------------------
            else if (roll < 0.68) {
                try {
                    const chats = await client.getChats();

                    // Ambil 6 chat terbaru, bukan random dari seluruh list
                    const recent = chats
                        .filter(c => !c.isGroup)
                        .slice(0, 6);

                    if (recent.length > 0) {
                        const pick = recent[Math.floor(Math.random() * recent.length)];

                        // Simulasi mengetik
                        await client.sendPresenceUpdate("composing", pick.id._serialized);
                        await sleep(jitter(600, 1900));
                        await client.sendPresenceUpdate("paused", pick.id._serialized);
                    }

                } catch (e) {
                    console.warn("presence composing error:", e.message);
                }
            }

            // -------------------------------------------------------
            // 4. Sisa 32%: idle saja (tidak update apa pun)
            // -------------------------------------------------------

            // -------------------------------------------------------
            // 5. Idle interval panjang (1.7 — 4.8 menit)
            // -------------------------------------------------------
            const idle = jitter(100000, 290000);
            await sleep(idle);

        } catch (err) {
            console.error("❌ presenceLoop fatal:", err.message);
            // tunggu 15 detik sebelum resume
            await sleep(15000);
        }
    }
}

module.exports = autoPresenceLoop;
