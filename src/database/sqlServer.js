// ===============================================================
//  SQL SERVER CONNECTION – FINAL 2025 EDITION
//  Stable Pooling + Auto Reconnect + Safe Logging + DEBUG
//  /src/database/sqlServer.js
// ===============================================================

require("dotenv").config();
const sql = require("mssql");

// ANSI Colors
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const blue = "\x1b[34m";
const magenta = "\x1b[35m";
const reset = "\x1b[0m";

let pool = null;
let connecting = false;

// ---------------------------------------------------------------
// DATABASE CONFIG
// ---------------------------------------------------------------
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,

    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
    },

    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
};

// ---------------------------------------------------------------
// VALIDATE POOL (cek pool masih hidup)
// ---------------------------------------------------------------
function isPoolHealthy(p) {
    if (!p) {
        console.warn(yellow, "[DB] Pool object is null/undefined", reset);
        return false;
    }
    if (p.connected === false || p._connected === false) {
        console.warn(yellow, "[DB] Pool not connected", reset);
        return false;
    }
    return true;
}

// ---------------------------------------------------------------
// MAIN FUNCTION: getPool()
// Auto reconnect + safe guard untuk mencegah loop
// ---------------------------------------------------------------
async function getPool() {
    try {
        // Jika pool masih sehat → langsung pakai
        if (isPoolHealthy(pool)) {
            console.info(blue, "[DB] Using existing healthy pool", reset);
            return pool;
        }

        // Jika sedang proses koneksi → tunggu
        if (connecting) {
            console.info(magenta, "[DB] Waiting existing connection...", reset);
            await new Promise(res => setTimeout(res, 500));
            return pool;
        }

        // Mulai koneksi baru
        connecting = true;
        console.log(yellow, "\n[DB] Connecting to SQL Server...", reset);

        pool = await sql.connect(dbConfig);

        connecting = false;

        if (pool.connected) {
            console.log(green, "[DB] SQL Server connected successfully!", reset);
        } else {
            console.warn(yellow, "[DB] Pool created but not connected!", reset);
        }

        return pool;

    } catch (err) {
        console.error(red, "[DB] SQL Connection Error:", err.message, reset);

        connecting = false;
        pool = null;

        // Retry otomatis
        console.log(yellow, "[DB] Retrying connection in 5 seconds...", reset);
        setTimeout(getPool, 5000);

        return null;
    }
}

// ---------------------------------------------------------------
// HANDLE POOL ERRORS (jika pool tiba-tiba mati)
// ---------------------------------------------------------------
sql.on("error", err => {
    console.error(red, "[DB] SQL ERROR EVENT:", err.message, reset);

    if (
        err.code === "ESOCKET" ||
        err.code === "ECONNCLOSED" ||
        err.code === "ENOTOPEN" ||
        err.message.includes("closed")
    ) {
        console.warn(yellow, "[DB] Connection lost → resetting pool...", reset);
        pool = null;
    }
});

// ---------------------------------------------------------------
module.exports = { sql, getPool };
