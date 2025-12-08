// src/handlers/messageHandler.js
const resolveContact = require('../utils/contactResolver');
const { humanDelay, simulateTyping, saveCooldowns } = require('../utils/humanHelpers');
const config = require('../core/config');

module.exports = async function (client, msg) {
    try {
        if (!msg || !msg.from || msg.fromMe) return;
        const senderId = msg.from;
        
        // 1. Cooldown Check & Filter Pesan Kosong
        const lastTime = config.USER_COOLDOWNS.get(senderId);
        const currentTime = Date.now();
        const COOLDOWN_MS = config.COOLDOWN_IN_MINUTES * 60 * 1000;
        
        if (lastTime && (currentTime - lastTime) < COOLDOWN_MS) return;
        if (msg.body === null || msg.body.trim() === '') return; 
        
        // 2. Human Delay & Auto-read
        await humanDelay(800, 3000);
        try {
            const chat = await msg.getChat();
            const readDelay = Math.min(6000, Math.max(800, msg.body ? msg.body.length * 40 : 900));
            await humanDelay(readDelay * 0.6, readDelay * 1.1);
            await chat.sendSeen();
        } catch {}

        // 3. Filter Grup/Broadcast
        if (msg.from.endsWith('@broadcast') || msg.from.endsWith('@g.us') || msg.type !== 'chat') return;

        // 4. Resolve Contact & Build Reply
        const resolved = await resolveContact(client, msg.from);
        const push = resolved.pushname || resolved.name || resolved.number;
        const replyText = "Halo @" + resolved.number + " (" + push + "), pesan ini dikirim menggunakan bot!, abaikan";
        
        // 5. Update Cooldown dan SIMPAN (DEBOUNCED)
        config.USER_COOLDOWNS.set(senderId, currentTime);
        saveCooldowns(config.USER_COOLDOWNS); 

        // 6. Typing simulation & Send
        await humanDelay(1100, 3200);
        const baseTyping = Math.min(3500, Math.max(900, replyText.length * 40));
        await simulateTyping(client, resolved.id._serialized, replyText, baseTyping);

        await humanDelay(400, 1200);
        await client.sendMessage(resolved.id._serialized, replyText);

    } catch (err) {
        console.error("message handler error:", err.message);
    }
};