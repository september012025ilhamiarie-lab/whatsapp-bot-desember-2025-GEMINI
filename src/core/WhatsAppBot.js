// ====================================================================
// WhatsAppBot.js — FINAL 2025 VERSION
// src/core/WhatsAppBot.js
// Fully Modular, Anti-Ban Ready, MessageService + OutboxHandler + CallHandler
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
const OutboxHandler = require("../handlers/outboxHandler");
const { enhancedMessageHandler } = require('../handlers/messageHandler');

class WhatsAppBot {
    constructor() {
        console.log("🔧 [WhatsAppBot] Constructor called");

        this.presenceStarted = false;

        // ---------------------------------------------------------------
        // CLIENT SETTINGS
        // ---------------------------------------------------------------
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: config.PUPPETEER_CONFIG,
            restartOnAuthFail: true,
            takeoverOnConflict: true,
            takeoverTimeoutMs: 3000,
        });
        console.log("[WhatsAppBot] WhatsApp client initialized");

        // ---------------------------------------------------------------
        // MESSAGE SERVICE
        // ---------------------------------------------------------------
        this.messageService = new MessageService(this.client, {
            antiBan,
            minDelay: 1000,
            maxDelay: 3000,
            maxRetries: 2
        });
        console.log("[WhatsAppBot] MessageService initialized with antiBan");

        // ---------------------------------------------------------------
        // OUTBOX HANDLER
        // ---------------------------------------------------------------
        this.outboxHandler = new OutboxHandler(this.client, this.messageService, config.OUTBOX_INTERVAL_MS);
        console.log("[WhatsAppBot] OutboxHandler instance created");
    }

    // -----------------------------------------------------------------
    // EVENT SETUP
    // -----------------------------------------------------------------
    setupEvents() {
        console.log("[WhatsAppBot] Setting up client events...");

        this.client.on("qr", qr => {
            console.log("⚡ [WhatsAppBot] QR code received");
            qrcode.generate(qr, { small: true });
        });

        this.client.on("ready", async () => {
            console.log("✅ [WhatsAppBot] Client ready");
            try {
                await this.handleReady();
            } catch (e) {
                console.error("[WhatsAppBot] handleReady error:", e);
            }
        });

        this.client.on("auth_failure", reason => {
            console.error("🚨 [WhatsAppBot] Auth failure:", reason);
            this.handleAuthFailure(reason);
        });

        this.client.on("disconnected", reason => {
            console.warn("⚠️ [WhatsAppBot] Client disconnected:", reason);
            this.handleDisconnect(reason);
        });

        this.client.on("message", msg => enhancedMessageHandler(this.client, msg, this.messageService));
        this.client.on("call", call => handleCall(this.client, call));

        console.log("[WhatsAppBot] Client events setup done");
    }

    // -----------------------------------------------------------------
    // READY HANDLER
    // -----------------------------------------------------------------
    handleReady = async () => {
        console.log("✅ [WhatsAppBot] READY — WhatsApp terhubung.");

        this.cleanOldCooldowns();

        if (!this.presenceStarted) {
            this.presenceStarted = true;
            console.log("[WhatsAppBot] Starting presence loop...");
            autoPresenceLoop(this.client)
                .then(() => console.log("[WhatsAppBot] presence loop started"))
                .catch(e => console.error("[WhatsAppBot] presenceLoop crash:", e));
        }

        // START OutboxHandler
        if (this.outboxHandler) {
            this.outboxHandler.start();
        }
    }

    // -----------------------------------------------------------------
    // DISCONNECT HANDLER
    // -----------------------------------------------------------------
    handleDisconnect(reason) {
        console.log("⚠️ [WhatsAppBot] WhatsApp disconnected:", reason);
        if (this.outboxHandler?.isRunning) this.outboxHandler.stop();

        setTimeout(() => {
            console.log("🔄 [WhatsAppBot] Reconnecting...");
            this.client.initialize();
        }, 3000);
    }

    // -----------------------------------------------------------------
    // AUTH FAILURE HANDLER
    // -----------------------------------------------------------------
    handleAuthFailure(reason) {
        console.error("🚨 [WhatsAppBot] Auth failed:", reason);
        const authDir = path.join(process.cwd(), ".wwebjs_auth");
        const profileDir = path.join(process.cwd(), "chrome_profile");

        try {
            if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true, force: true });
            if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
            console.log("🔥 Folder sesi dihapus — restart login.");
        } catch (err) {
            console.error("[WhatsAppBot] Failed to remove session folders:", err);
        }

        setTimeout(() => process.exit(1), 2000);
    }

    // -----------------------------------------------------------------
    // CLEAN USER COOLDOWNS
    // -----------------------------------------------------------------
    cleanOldCooldowns() {
        console.log("[WhatsAppBot] Cleaning old cooldowns...");
        const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let removed = 0;

        if (!config.USER_COOLDOWNS || !(config.USER_COOLDOWNS instanceof Map)) {
            console.warn("[WhatsAppBot] USER_COOLDOWNS not ready, skip cleaning");
            return;
        }

        for (const [user, time] of config.USER_COOLDOWNS.entries()) {
            if (now - time > MAX_AGE) {
                config.USER_COOLDOWNS.delete(user);
                removed++;
            }
        }

        if (removed > 0) {
            antiBan.saveCooldowns(config.USER_COOLDOWNS);
            console.log(`🧹 Cleaned cooldowns: ${removed} users`);
        }
    }

    // -----------------------------------------------------------------
    // INITIALIZE
    // -----------------------------------------------------------------
    initialize() {
        console.log("[WhatsAppBot] Initializing bot...");
        this.setupEvents();
        this.client.initialize();
    }
}

module.exports = WhatsAppBot;
