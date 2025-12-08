// src/core/config.js
const { loadCooldowns } = require('../utils/humanHelpers'); 

module.exports = {
    REJECT_CALLS: process.env.BOT_REJECT_CALLS === 'true',
    COOLDOWN_IN_MINUTES: parseInt(process.env.BOT_COOLDOWN_MINUTES) || 60,
    USER_COOLDOWNS: loadCooldowns(), // Dimuat dari file saat startup
    
    PUPPETEER_CONFIG: {
        headless: process.env.PUPPETEER_HEADLESS === 'true',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, 
        args: [
            '--user-data-dir=./chrome_profile',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote',
            '--window-size=1280,720',
            '--start-maximized',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--disable-gpu',
            '--use-angle=software',
        ]
    }
};