// =============================
// MESSAGE QUEUE SYSTEM
// =============================
class MessageQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.minDelay = 1200; // 1.2 detik
        this.maxDelay = 3500; // 3.5 detik
    }

    add(job) {
        console.log("[QUEUE] Menambahkan job:", job.type, "->", job.to);
        this.queue.push(job);
        this.run();
    }

    async run() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            console.log("[QUEUE] Memproses job:", job.type, "ke:", job.to);

            try {
                await job.execute();
                console.log("[QUEUE] Job selesai:", job.type);
            } catch (err) {
                console.error("[QUEUE] ERROR job:", err);
            }

            // Delay anti-ban
            const delay = this.randomDelay();
            console.log(`[QUEUE] Delay anti-ban: ${delay} ms...\n`);
            await new Promise(res => setTimeout(res, delay));
        }

        this.isProcessing = false;
    }

    randomDelay() {
        return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    }
}

const messageQueue = new MessageQueue();


// =============================
// MESSAGE SERVICE
// =============================
class MessageService {
    constructor(client) {
        this.client = client;
    }

    // ==========================================
    // 1. SEND TEXT MESSAGE
    // ==========================================
    sendText(to, message) {
        messageQueue.add({
            type: "text",
            to,
            execute: async () => {
                console.log(`[SEND TEXT] Ke: ${to} | Isi: ${message}`);
                await this.client.sendMessage(to, message);
            }
        });
    }

    // ==========================================
    // 2. SEND TEXT WITH QUOTED MESSAGE
    // ==========================================
    sendTextQuoted(to, message, quotedMsgObj) {
        messageQueue.add({
            type: "text_quoted",
            to,
            execute: async () => {
                console.log(`[SEND QUOTED] Ke: ${to} | Quoted ID: ${quotedMsgObj?.id}`);

                await this.client.sendMessage(to, message, {
                    quotedMessageId: quotedMsgObj.id
                });
            }
        });
    }

    // ==========================================
    // 3. SEND REACTION (👍 😀 ❤️ 🔥)
    // ==========================================
    sendReaction(messageObj, emoji) {
        messageQueue.add({
            type: "reaction",
            to: messageObj.from,
            execute: async () => {
                console.log(`[REACTION] Ke: ${messageObj.from} | Emoji: ${emoji} | msgId: ${messageObj.id.id}`);

                await messageObj.react(emoji);
            }
        });
    }

    // ==========================================
    // 4. BULK OUTBOX (DARI DATABASE)
    // ==========================================
    async enqueueBulkMessages(rows) {
        console.log(`[BULK] Memasukkan ${rows.length} pesan ke antrian`);

        for (const row of rows) {
            messageQueue.add({
                type: "outbox",
                to: row.destination,
                execute: async () => {
                    console.log(`[OUTBOX] Kirim ke ${row.destination}: ${row.message}`);

                    await this.client.sendMessage(row.destination, row.message);

                    // contoh jika mau update status:
                    // await updateOutboxStatus(row.id, "SENT");
                }
            });
        }
    }
}

module.exports = MessageService;
