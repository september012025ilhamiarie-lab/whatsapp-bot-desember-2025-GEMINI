// src/utils/presenceLoop.js
const { humanDelay, jitter, sleep } = require('./humanHelpers');

async function autoPresenceLoop(client) {
    console.log("Starting Auto Presence Loop...");
    while (true) {
        try {
            const rand = Math.random();
            if (rand < 0.4) { try { await client.sendPresenceAvailable(); } catch {} }
            else if (rand < 0.7) { try { await client.sendPresenceUnavailable(); } catch {} }
            else {
                try {
                    const chats = await client.getChats();
                    if (chats && chats.length) {
                        const sample = chats[Math.floor(Math.random() * chats.length)];
                        if (sample && sample.id && sample.id._serialized) {
                            await client.sendPresenceUpdate("composing", sample.id._serialized);
                            await sleep(jitter(500, 2000));
                            await client.sendPresenceUpdate("paused", sample.id._serialized);
                        }
                    }
                } catch (e) {}
            }
            await humanDelay(6000, 22000); 
        } catch (err) {
            console.error("autoPresenceLoop error:", err.message);
            await sleep(5000);
        }
    }
}
module.exports = autoPresenceLoop;