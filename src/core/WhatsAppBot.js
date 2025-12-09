// src/core/WhatsAppBot.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { saveCooldowns } = require("../utils/humanHelpers");
const autoPresenceLoop = require("../utils/presenceLoop");

const MessageService = require("../service/messageService");
const handleCall = require("../handlers/callHandler");

const {
    legacyMessageHandler,
    enhancedMessageHandler
} = require('../handlers/messageHandler');

class WhatsAppBot {
    constructor() {
        this.presenceStarted = false;

        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: config.PUPPETEER_CONFIG,

            // Added for WA stability
            restartOnAuthFail: true,
            takeoverOnConflict: true,
            takeoverTimeoutMs: 3000,
        });

        this.messageService = new MessageService(this.client);
    }

    setupEvents() {
        // QR Code
        this.client.on("qr", this.handleQr);

        // Basic session
        this.client.on("ready", this.handleReady.bind(this));
        this.client.on("auth_failure", this.handleAuthFailure.bind(this));
        this.client.on("disconnected", this.handleDisconnect.bind(this));

        // Incoming actions
        this.client.on("message", async (msg) => {
            await enhancedMessageHandler(this.client, msg, this.messageService);
        });

        //🔥 New WA API for call events
       this.client.on("call", (call) => handleCall(this.client, call));
    }

    //───────────────────────────────────────────
    // QR HANDLER
    //───────────────────────────────────────────
    handleQr(qr) {
        console.log("SCAN QR UNTUK LOGIN WHATSAPP:");
        qrcode.generate(qr, { small: true });
    }

    //───────────────────────────────────────────
    // READY HANDLER
    //───────────────────────────────────────────
    handleReady() {
        console.log("READY — sukses tersambung ke WhatsApp.");

        this.cleanOldCooldowns();

        // 🔥 Prevent multiple presence loop
        if (!this.presenceStarted) {
            this.presenceStarted = true;

            autoPresenceLoop(this.client).catch((e) =>
                console.error("autoPresenceLoop crashed:", e)
            );
        }
    }

    //───────────────────────────────────────────
    // HANDLE DISCONNECT
    //───────────────────────────────────────────
    handleDisconnect(reason) {
        console.log("⚠️ WhatsApp DISCONNECTED:", reason);

        // WA sometimes reconnects itself automatically
        // Wait 3 seconds, then attempt re-init
        setTimeout(() => {
            console.log("Mencoba reconnect WhatsApp...");
            this.client.initialize();
        }, 3000);
    }

    //───────────────────────────────────────────
    // HANDLE AUTH FAILURE
    //───────────────────────────────────────────
    handleAuthFailure(reason) {
        console.error("🚨 AUTENTIKASI GAGAL:", reason);

        const authDir = path.join(process.cwd(), ".wwebjs_auth");
        const profileDir = path.join(process.cwd(), "chrome_profile");

        try {
            if (fs.existsSync(authDir))
                fs.rmSync(authDir, { recursive: true, force: true });

            if (fs.existsSync(profileDir))
                fs.rmSync(profileDir, { recursive: true, force: true });

            console.log("Folder sesi dihapus. Restart agar login ulang.");
        } catch (err) {
            console.error("Gagal hapus folder sesi:", err);
        }

        setTimeout(() => process.exit(1), 2000);
    }

    //───────────────────────────────────────────
    // CLEAN USER COOLDOWN > 30 DAYS
    //───────────────────────────────────────────
    cleanOldCooldowns() {
        const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let removed = 0;

        for (const [user, time] of config.USER_COOLDOWNS.entries()) {
            if (now - time > MAX_AGE) {
                config.USER_COOLDOWNS.delete(user);
                removed++;
            }
        }

        if (removed > 0) {
            saveCooldowns(config.USER_COOLDOWNS);
            console.log(`Cooldown dibersihkan: ${removed} user.`);
        }
    }

    initialize() {
        this.setupEvents();
        this.client.initialize();
    }
}

module.exports = WhatsAppBot;
