// ====================================================================
// WhatsAppBot.js — FINAL 2025 VERSION
// src/core/WhatsAppBot.js
// Modular, Anti-Ban Ready, Auto-Inject MessageService
// ====================================================================

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const antiBan = require("../utils/humanHelpers");
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

        // ---------------------------------------------------------------
        // CLIENT SETTINGS — Aman & Stabil
        // ---------------------------------------------------------------
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: config.PUPPETEER_CONFIG,

            // stabilisasi WA Web 2025
            restartOnAuthFail: true,
            takeoverOnConflict: true,
            takeoverTimeoutMs: 3000,

            // dapat ditambah jika butuh stealth
            // webVersionCache: { type: "remote", remotePath: "…" }
        });

        // ---------------------------------------------------------------
        // AUTO-INJECT MessageService dengan antiBan
        // ---------------------------------------------------------------
        this.messageService = new MessageService(this.client, {
            antiBan,
            minDelay: 1000,
            maxDelay: 3000,
            maxRetries: 2
        });
    }

    // -----------------------------------------------------------------
    // EVENT SETUP
    // -----------------------------------------------------------------
    setupEvents() {
        // QR LOGIN
        this.client.on("qr", this.handleQr);

        // session-primary
        this.client.on("ready", this.handleReady.bind(this));
        this.client.on("auth_failure", this.handleAuthFailure.bind(this));
        this.client.on("disconnected", this.handleDisconnect.bind(this));

        // handle incoming chat messages
        this.client.on('message', (msg) => enhancedMessageHandler(this.client, msg, this.messageService));

        // Call Event
        this.client.on("call", (call) => handleCall(this.client, call));
    }

    // -----------------------------------------------------------------
    // QR HANDLER
    // -----------------------------------------------------------------
    handleQr(qr) {
        console.log("⚡ SCAN QR UNTUK LOGIN WHATSAPP:");
        qrcode.generate(qr, { small: true });
    }

    // -----------------------------------------------------------------
    // READY
    // -----------------------------------------------------------------
    handleReady() {
        console.log("✅ READY — WhatsApp terhubung.");

        this.cleanOldCooldowns();

        // Hindari multiple presence loop
        if (!this.presenceStarted) {
            this.presenceStarted = true;

            autoPresenceLoop(this.client)
                .catch(e => console.error("autoPresenceLoop crash:", e));
        }
    }

    // -----------------------------------------------------------------
    // DISCONNECT HANDLER
    // -----------------------------------------------------------------
    handleDisconnect(reason) {
        console.log("⚠️ WhatsApp DISCONNECTED:", reason);

        // WhatsApp biasanya reconnect otomatis — tunggu 3 detik
        setTimeout(() => {
            console.log("🔄 Mencoba reconnect WhatsApp...");
            this.client.initialize();
        }, 3000);
    }

    // -----------------------------------------------------------------
    // AUTH FAILURE
    // -----------------------------------------------------------------
    handleAuthFailure(reason) {
        console.error("🚨 AUTENTIKASI GAGAL:", reason);

        const authDir = path.join(process.cwd(), ".wwebjs_auth");
        const profileDir = path.join(process.cwd(), "chrome_profile");

        try {
            if (fs.existsSync(authDir))
                fs.rmSync(authDir, { recursive: true, force: true });

            if (fs.existsSync(profileDir))
                fs.rmSync(profileDir, { recursive: true, force: true });

            console.log("🔥 Folder sesi dihapus — restart untuk login ulang.");
        } catch (err) {
            console.error("Gagal hapus folder sesi:", err);
        }

        setTimeout(() => process.exit(1), 2000);
    }

    // -----------------------------------------------------------------
    // CLEAN COOLDOWN FILE > 30 DAYS
    // -----------------------------------------------------------------
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
            antiBan.saveCooldowns(config.USER_COOLDOWNS);
            console.log(`🧹 Cooldown dibersihkan: ${removed} user.`);
        }
    }

    // -----------------------------------------------------------------
    // INITIALIZE
    // -----------------------------------------------------------------
    initialize() {
        this.setupEvents();
        this.client.initialize();
    }
}

module.exports = WhatsAppBot;
