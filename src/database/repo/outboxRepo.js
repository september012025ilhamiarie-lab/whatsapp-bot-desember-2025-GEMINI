// ====================================================================
//  OUTBOX REPO
//  /src/database/repo/outboxRepo.js
// ====================================================================

// src/database/repo/outboxRepo.js
const { runQuery, runExecute } = require("../queryTools");
const { getSqlDateFormat } = require("../../helper/dateTools");

const { AKHIRAN_WHATSAPP_KE_OUTBOX } = require("../../core/config");

async function updateStatusOutbox(kode, status) {
    const now = getSqlDateFormat(new Date());

    const query =
        "UPDATE outbox SET " +
        "tgl_status = CONVERT(DATETIME, '" + now + "', 102), " +
        "status = " + status + " " +
        "WHERE (kode = " + kode + ")";

    return await runExecute(query);
}

async function updateStatusOutboxAddOnWA(kode, status, pengirim_outbox) {
    const now = getSqlDateFormat(new Date());

    const query =
        "UPDATE outbox SET " +
        "tgl_status = CONVERT(DATETIME, '" + now + "', 102), " +
        "status = " + status + ", " +
        "pengirim = '" + pengirim_outbox + "', " +
        "kode_terminal = 0 " +
        "WHERE (kode = " + kode + ")";

    return await runExecute(query);
}

async function getOutboxData(limit = 5) {
    const query = `
        SELECT TOP (${limit})
            o.kode,
            o.kode_reseller,
            r.nama,
            o.tgl_entri,
            o.penerima,
            o.tipe_penerima,
            o.pesan,
            o.tgl_status,
            o.status
        FROM dbo.outbox AS o
        INNER JOIN dbo.reseller AS r 
            ON o.kode_reseller = r.kode
        WHERE 
            o.status = 0
            AND o.tipe_penerima = 'Y'
            AND (
                o.penerima LIKE '%@${AKHIRAN_WHATSAPP_KE_OUTBOX}'
                OR o.penerima LIKE '%@${AKHIRAN_WHATSAPP_KE_OUTBOX}%'
            )
        ORDER BY o.tgl_entri;
    `;

    return runQuery(query);
}


async function markAsFailed(kode) {
    const now = getSqlDateFormat(new Date());
    const query = `
        UPDATE outbox SET
            tgl_status = CONVERT(DATETIME, '${now}', 102),
            status = 3
        WHERE kode = ${kode};
    `;
    return runExecute(query);
}

module.exports = {
    getOutboxData,
    updateStatusOutboxAddOnWA,
    updateStatusOutbox,
    markAsFailed
};