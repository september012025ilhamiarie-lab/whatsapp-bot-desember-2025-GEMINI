// src/database/repo/inboxRepo.js
const { runExecute } = require("../queryTools");
const { getSqlDateFormat } = require("../../helper/dateTools");

async function insertInbox({ kodeReseller, pengirim, pesan }) {
    const now = getSqlDateFormat(new Date());

    const query =
        "INSERT INTO inbox " +
        "(tgl_entri, pengirim, tipe_pengirim, pesan, status, kode_terminal, tgl_status, kode_reseller, is_jawaban) " +
        "VALUES (" +
        "CONVERT(DATETIME, '" + now + "', 102), " +
        "'" + pengirim + "', " +
        "'Y', " +
        "'" + pesan + "', " +
        "0, " +
        "0, " +
        "'" + now + "', " +
        "'" + kodeReseller + "', " +
        "0)";

    return await runExecute(query);
}

module.exports = { insertInbox };
