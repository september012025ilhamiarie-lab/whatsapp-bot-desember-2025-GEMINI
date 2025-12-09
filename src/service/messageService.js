// ====================================================================
// messageService.js — FINAL 2025 EDITION
// src/service/messageService.js
// Anti-Ban Queue + Human-like Delay + Retry System
// ====================================================================

class MessageQueue {
    constructor(antiBan, minDelay = 1200, maxDelay = 3500, maxRetries = 2) {
        this.queue = [];
        this.isProcessing = false;

        this.antiBan = antiBan;
        this.minDelay = minDelay;
        this.maxDelay = maxDelay;
        this.maxRetries = maxRetries;
    }

    add(job) {
        console.log(`[QUEUE] Menambahkan job: ${job.type} -> ${job.to}`);
        this.queue.push(job);
        this.run();
    }

    async run() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            let attempt = 0;

            console.log(`[QUEUE] Memproses job: ${job.type} untuk ${job.to}`);

            while (attempt <= this.maxRetries) {
                try {
                    await job.execute();
                    console.log(`[QUEUE] Job selesai: ${job.type}`);
                    break;
                } catch (err) {
                    attempt++;

                    console.error(
                        `[QUEUE] ERROR pada job ${job.type} (attempt ${attempt}):`,
                        err.message
                    );

                    if (attempt > this.maxRetries) {
                        console.error(`[QUEUE] Gagal permanen: ${job.type}`);
                        break;
                    }

                    const backoff = 800 + Math.random() * 1200;
                    console.log(`[QUEUE] Backoff retry: ${backoff}ms`);
                    await new Promise(res => setTimeout(res, backoff));
                }
            }

            // Delay anti-ban antar job
            const delay = this.randomDelay();
            console.log(`[QUEUE] Anti-ban delay ${delay}ms...\n`);
            await this.antiBan.humanDelay(delay * 0.6, delay);
        }

        this.isProcessing = false;
    }

    randomDelay() {
        return Math.floor(
            Math.random() * (this.maxDelay - this.minDelay + 1)
        ) + this.minDelay;
    }
}

// ====================================================================
// MESSAGE SERVICE — menggunakan MessageQueue
// ====================================================================

class MessageService {
    constructor(client, { antiBan, minDelay = 1000, maxDelay = 3000, maxRetries = 2 }) {
        this.client = client;

        this.queue = new MessageQueue(
            antiBan,
            minDelay,
            maxDelay,
            maxRetries
        );

        this.antiBan = antiBan;
        this.maxRetries = maxRetries;
    }

    // ==========================================================
    // 1. SEND TEXT
    // ==========================================================
    sendText(to, message) {
        this.queue.add({
            type: "text",
            to,
            execute: async () => {
                console.log(`[TEXT] Ke ${to}: "${message}"`);

                await this.antiBan.humanDelay(500, 1500);

                await this.client.sendMessage(to, message);
            }
        });
    }

    // ==========================================================
    // 2. SEND TEXT QUOTED
    // ==========================================================
    sendTextQuoted(to, message, quotedMsg) {
        this.queue.add({
            type: "text_quoted",
            to,
            execute: async () => {
                console.log(`[TEXT QUOTED] -> ${to}`);

                await this.antiBan.simulateTyping(this.client, to, message);

                await this.client.sendMessage(to, message, {
                    quotedMessageId: quotedMsg?.id
                });
            }
        });
    }

    // ==========================================================
    // 3. SEND REACTION
    // ==========================================================
    sendReaction(msg, emoji) {
        this.queue.add({
            type: "reaction",
            to: msg.from,
            execute: async () => {
                console.log(`[REACTION] ${emoji} -> ${msg.from}`);

                await this.antiBan.humanDelay(300, 900);

                await msg.react(emoji);
            }
        });
    }

    // ==========================================================
    // 4. SEND MEDIA (image, pdf, audio)
    // ==========================================================
    sendMedia(to, media, caption = "") {
        this.queue.add({
            type: "media",
            to,
            execute: async () => {
                console.log(`[MEDIA] Kirim media -> ${to}`);

                await this.antiBan.simulateTyping(this.client, to, caption);

                await this.client.sendMessage(to, media, { caption });
            }
        });
    }

    // ==========================================================
    // 5. BULK OUTBOX (DATABASE TABLE)
    // ==========================================================
    async enqueueBulkMessages(rows) {
        console.log(`[OUTBOX BULK] Memasukkan ${rows.length} pesan...`);

        for (const row of rows) {
            this.queue.add({
                type: "outbox",
                to: row.destination,
                execute: async () => {
                    console.log(`[OUTBOX] -> ${row.destination}`);

                    await this.client.sendMessage(row.destination, row.message);

                    // contoh logic update DB:
                    // await updateOutboxStatus(row.id, "SENT");
                }
            });
        }
    }
}

module.exports = MessageService;
