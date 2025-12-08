module.exports = {
  apps: [
    {
      name: "whatsapp-bot-responder",
      script: "./index.js",

      // RUN MODE
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,

      // PROCESS STABILITY
      min_uptime: "5s",            // dianggap hidup stabil jika >5s
      max_restarts: 10,            // hindari restart loop
      restart_delay: 5000,         // tunggu 5 detik sebelum restart
      kill_timeout: 5000,          // beri waktu puppeteer shutdown
      max_memory_restart: "500M",  // restart jika >500 MB RAM

      // LOGGING
      out_file: "./logs/console.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // ENVIRONMENT
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
