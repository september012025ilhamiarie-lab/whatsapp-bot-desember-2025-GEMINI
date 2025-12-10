// ====================================================================
// OutboxHandler.js — FINAL 2025
// Queue-based, Retry, Anti-Ban, Reply Support
// ====================================================================

const { getOutboxData, updateStatusOutboxAddOnWA, markAsFailed } = require('../database/repo/outboxRepo');
const { humanDelay } = require('../utils/humanHelpers');

class OutboxHandler {
    constructor(client, messageService, { batchLimit = 5, intervalMs = 2000 } = {}) {
        this.client = client;
        this.messageService = messageService;
        this.batchLimit = batchLimit;
        this.intervalMs = intervalMs;
        this.isRunning = false;
        this.queue = [];
        this.processing = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[OutboxHandler] Started with interval ${this.intervalMs}ms`);
        this.loop();
    }

    stop() {
        this.isRunning = false;
        console.log('[OutboxHandler] Stopped');
    }

    async loop() {
        while (this.isRunning) {
            try {
                await this.fetchQueue();
                await this.processQueue();
            } catch (err) {
                console.error('[OutboxHandler] Loop error:', err);
            }
            await new Promise(r => setTimeout(r, this.intervalMs));
        }
    }

    async fetchQueue() {
        if (this.queue.length > 0) return; // masih ada job
        const rows = await getOutboxData(this.batchLimit);
        if (rows?.length) {
            this.queue.push(...rows);
            console.log(`[OutboxHandler] Fetched ${rows.length} messages into queue`);
        }
    }

    parseDbJid(dbJid) {
        if (!dbJid) return null;

        const [nomorPart, rest] = dbJid.split('@');
        let nomor = nomorPart || '';
        let idPesan = null;

        if (rest?.includes('#')) {
            const parts = rest.split('#');
            idPesan = parts[1] || null;
        }

        // Ganti suffix DB menjadi @c.us untuk WA
        const sendJid = `${nomor}@c.us`;

        // Serialisasi WA Web.js untuk reply
        const serializedId = idPesan ? `false_${sendJid}_${idPesan}` : null;

        return { sendJid, idPesan: serializedId };
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const row = this.queue.shift();
            const { sendJid, idPesan } = this.parseDbJid(row.penerima);

            if (!sendJid) {
                console.warn(`[OutboxHandler] Invalid JID for kode=${row.kode}, skipping`);
                continue;
            }

            let attempt = 0;
            let sent = false;
            const maxRetries = this.messageService?.maxRetries || 3;

            while (attempt < maxRetries && !sent) {
                attempt++;
                try {
                    if (idPesan) {
                        console.log(`[OUTBOX] Sending to ${sendJid} (kode=${row.kode}, attempt ${attempt}) as reply`);
                        await this.client.sendMessage(sendJid, row.pesan, { quotedMessageId: idPesan });
                    } else {
                        console.log(`[OUTBOX] Sending to ${sendJid} (kode=${row.kode}, attempt ${attempt})`);
                        await this.client.sendMessage(sendJid, row.pesan);
                    }

                    await updateStatusOutboxAddOnWA(row.kode, 20, row.penerima);
                    console.log(`[OutboxHandler] ✅ Sent kode=${row.kode}`);
                    sent = true;

                    // Delay anti-ban antar pesan
                    const delay = 800 + Math.random() * 1200;
                    await humanDelay(delay * 0.5, delay);

                } catch (err) {
                    console.error(`[OutboxHandler] ❌ Failed kode=${row.kode} (attempt ${attempt}):`, err.message);

                    if (attempt >= maxRetries) {
                        console.error(`[OutboxHandler] ❌ Permanen failed kode=${row.kode}`);
                        await markAsFailed(row.kode);
                        break;
                    }

                    const backoff = 800 + Math.random() * 1500;
                    console.log(`[OutboxHandler] Retry backoff: ${backoff.toFixed(0)}ms`);
                    await humanDelay(backoff, backoff + 200);
                }
            }
        }

        this.processing = false;
    }
}

module.exports = OutboxHandler;
