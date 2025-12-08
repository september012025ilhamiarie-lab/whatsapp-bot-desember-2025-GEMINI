// src/core/WhatsAppBot.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { saveCooldowns } = require('../utils/humanHelpers'); 
const autoPresenceLoop = require('../utils/presenceLoop');
const handleMessage = require('../handlers/messageHandler');
const handleCall = require('../handlers/callHandler');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: config.PUPPETEER_CONFIG,
        });
    }

    setupEvents() {
        this.client.on('qr', this.handleQr);
        this.client.on('ready', this.handleReady.bind(this));
        this.client.on('auth_failure', this.handleAuthFailure.bind(this)); // Penanganan Sesi Gagal
        
        this.client.on('message', (msg) => handleMessage(this.client, msg));
        this.client.on('call', (call) => handleCall(this.client, call));
        
        this.client.on('disconnected', this.handleDisconnect);
    }

    // --- Handlers Sesi ---
    handleQr(qr) {
        qrcode.generate(qr, { small: true });
    }

    handleReady() {
        console.log("READY — connected to WhatsApp.");
        // Jalankan pembersihan cooldown lama dan loop kehadiran
        this.cleanOldCooldowns(); 
        autoPresenceLoop(this.client).catch(e => console.error('autoPresenceLoop crashed:', e.message));
    }
    
    handleDisconnect(reason) {
        console.log('WHATSAPP WEB CLIENT SUDAH LOG-OUT', reason);
    }
    
    handleAuthFailure(reason) {
        console.error('🚨 AUTENTIKASI GAGAL! Sesi rusak. Alasan:', reason);
        const authDir = path.join(process.cwd(), '.wwebjs_auth');
        const profileDir = path.join(process.cwd(), 'chrome_profile');
        
        try {
            if (fs.existsSync(authDir)) {
                fs.rmSync(authDir, { recursive: true, force: true });
            }
            if (fs.existsSync(profileDir)) {
                 fs.rmSync(profileDir, { recursive: true, force: true });
            }
            console.log('Folder sesi dihapus. Memaksa restart agar PM2 membuat QR baru.');
        } catch (e) {
            console.error('Gagal menghapus folder sesi:', e.message);
        }
        
        setTimeout(() => {
            process.exit(1); // PM2 akan me-restart
        }, 3000);
    }

    // --- Utility Internal ---
    cleanOldCooldowns() {
        const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
        const currentTime = Date.now();
        let cleanedCount = 0;
        
        for (const [senderId, lastTime] of config.USER_COOLDOWNS.entries()) {
            if (currentTime - lastTime > ONE_MONTH_MS) {
                config.USER_COOLDOWNS.delete(senderId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            saveCooldowns(config.USER_COOLDOWNS);
            console.log(`Pembersihan Cooldown selesai. Dihapus: ${cleanedCount} entri.`);
        }
    }

    initialize() {
        this.setupEvents();
        this.client.initialize();
    }
}

module.exports = WhatsAppBot;