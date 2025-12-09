// src/database/sqlServer.js
require("dotenv").config();
const sql = require("mssql");

// ANSI Colors
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const blue = "\x1b[34m";
const reset = "\x1b[0m";

let pool = null;

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

async function getPool() {
    try {
        if (pool) {
            console.log(blue, "[DB] Reusing existing SQL connection pool", reset);
            return pool;
        }

        console.log(yellow, "[DB] Connecting to SQL Server...", reset);

        pool = await sql.connect(dbConfig);

        console.log(green, "[DB] SQL Server connected successfully!", reset);
        return pool;

    } catch (err) {
        console.error(red, "[DB] SQL Connection Error:", err.message, reset);
        pool = null;

        console.log(yellow, "[DB] Retry connection in 5 seconds...", reset);
        setTimeout(getPool, 5000);
    }
}

module.exports = { sql, getPool };
