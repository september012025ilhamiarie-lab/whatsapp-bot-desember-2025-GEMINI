// src/handlers/callHandler.js
const resolveContact = require('../utils/contactResolver');
const { humanDelay, simulateTyping, saveCooldowns } = require('../utils/humanHelpers');
const config = require('../core/config');

module.exports = async function (client, call) {
    try {
        if (!config.REJECT_CALLS) return; 
        
        try { await call.reject(); } catch {}
        
        const senderId = call.from;
        const currentTime = Date.now();
        
        const lastTime = config.USER_COOLDOWNS.get(senderId);
        const COOLDOWN_MS = config.COOLDOWN_IN_MINUTES * 60 * 1000;
        if (lastTime && (currentTime - lastTime) < COOLDOWN_MS) return; // Cooldown aktif, jangan balas call
        
        const resolved = await resolveContact(client, call.from);
        const push = resolved.pushname || resolved.name || resolved.number;

        const callReply =
            "Kak @" + resolved.number +
            " (" + push +
            "), WhatsApp ini tidak bisa menerima call/video call ya. Hanya chat saja 🙏";

        config.USER_COOLDOWNS.set(senderId, currentTime); // Reset Cooldown
        saveCooldowns(config.USER_COOLDOWNS);
        
        await humanDelay(1500, 4200);
        await simulateTyping(client, resolved.id._serialized, callReply, Math.min(3000, callReply.length * 40));
        await humanDelay(500, 1500);
        await client.sendMessage(resolved.id._serialized, callReply);
    } catch (err) {
        console.error("call handler error:", err.message);
    }
};