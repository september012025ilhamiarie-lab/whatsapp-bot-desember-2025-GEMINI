// index.js
require('dotenv').config(); // Muat variabel environment
const WhatsAppBot = require('./src/core/WhatsAppBot');

console.log("Starting WhatsApp Bot...");
new WhatsAppBot().initialize();