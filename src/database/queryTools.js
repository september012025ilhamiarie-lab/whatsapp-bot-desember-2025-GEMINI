// src/database/queryTools.js
const { getPool, sql } = require("./sqlServer");

const blue = "\x1b[34m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const reset = "\x1b[0m";

async function runQuery(query, params = {}) {
    const pool = await getPool();
    const request = pool.request();

    // Log parameter binding
    console.log(blue, "[SQL] Preparing query...", reset);
    console.log(blue, "QUERY:", query, reset);

    if (Object.keys(params).length > 0) {
        console.log(yellow, "[SQL] Params:", params, reset);
    }

    for (const key in params) {
        request.input(key, params[key]);
    }

    try {
        const result = await request.query(query);

        console.log(blue, `[SQL] Rows returned: ${result.recordset.length}`, reset);

        return result.recordset;

    } catch (err) {
        console.error(red, "[SQL] Query Error:", err.message, reset);
        return null;
    }
}

module.exports = { runQuery };
