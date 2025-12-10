// src/database/queryTools.js
const { getPool } = require("./sqlServer");

module.exports = {
    async runQuery(query) {
        const pool = await getPool();
        if (!pool) {
            console.error("[SQL] runQuery → Pool is null, query tidak dijalankan");
            return null;
        }

        try {
            console.log("[SQL] 🔹 Mengirim query ke SQL Server...");
            console.log("[SQL] Query:", query);

            const result = await pool.request().query(query);

            if (!result) {
                console.warn("[SQL] runQuery → Result undefined");
                return null;
            }

            console.log("[SQL] ✅ Query selesai, recordset length:", result.recordset?.length || 0);
            return result.recordset || [];
        } catch (err) {
            console.error("[SQL] ❌ Query Error:", err.message);
            return null;
        }
    },

    async runExecute(query) {
        const pool = await getPool();
        if (!pool) {
            console.error("[SQL] runExecute → Pool is null, query tidak dijalankan");
            return false;
        }

        try {
            console.log("[SQL] 🔹 Execute query ke SQL Server...");
            console.log("[SQL] Query:", query);
            await pool.request().query(query);
            console.log("[SQL] ✅ Execute sukses");
            return true;
        } catch (err) {
            console.error("[SQL] ❌ Execute Error:", err.message);
            return false;
        }
    }
};
