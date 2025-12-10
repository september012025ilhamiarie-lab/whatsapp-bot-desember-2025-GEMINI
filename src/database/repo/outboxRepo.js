// src/database/repo/outboxRepo.js
const { runQuery, runExecute } = require("../queryTools");
const { getSqlDateFormat } = require("../../helper/dateTools");

const { AKHIRAN_WHATSAPP_KE_OUTBOX } = require("../../config");

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

async function getOutboxData() {
    const query =
        "SELECT TOP (5) " +
        "dbo.outbox.kode, " +
        "dbo.outbox.kode_reseller, " +
        "dbo.reseller.nama, " +
        "dbo.outbox.tgl_entri, " +
        "dbo.outbox.penerima, " +
        "dbo.outbox.tipe_penerima, " +
        "dbo.outbox.pesan, " +
        "dbo.outbox.tgl_status, " +
        "dbo.outbox.status " +
        "FROM dbo.outbox " +
        "INNER JOIN dbo.reseller ON dbo.outbox.kode_reseller = dbo.reseller.kode " +
        "WHERE (dbo.outbox.status = 0) " +
        "AND (dbo.outbox.tipe_penerima = 'Y') " +
        "AND ((dbo.outbox.penerima LIKE '%@" + AKHIRAN_WHATSAPP_KE_OUTBOX + "') " +
        "OR (dbo.outbox.penerima LIKE '%@" + AKHIRAN_WHATSAPP_KE_OUTBOX + "%')) " +
        "ORDER BY dbo.outbox.tgl_entri";

    return await runQuery(query);
}

module.exports = {
    getOutboxData,
    updateStatusOutbox,
    updateStatusOutboxAddOnWA
};
