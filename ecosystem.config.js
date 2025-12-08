// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "whatsapp-bot-responder",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: '500M',
      
      // Logging
      out_file: "./logs/console.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      
      // Environment
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};