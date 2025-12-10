// src/database/repo/pengirimRepo.js
const { runQuery } = require("../queryTools");

async function getPengirimByNomor(nomorHp) {
    console.info("[getPengirimByNomor] Mencari nomor:", nomorHp);

    let pengirim1 = "";
    let pengirim2 = "";

    if (nomorHp.startsWith("628")) {
        pengirim1 = "+" + nomorHp;
        pengirim2 = "0" + nomorHp.substring(2);
    } else {
        pengirim1 = nomorHp;
        pengirim2 = nomorHp;
    }

    console.info("[getPengirimByNomor] Querying dengan pengirim1:", pengirim1, "pengirim2:", pengirim2);

    const query =
        "SELECT " +
        " dbo.pengirim.kode_reseller, " +
        " dbo.reseller.nama, " +
        " dbo.pengirim.tipe_pengirim, " +
        " dbo.pengirim.pengirim, " +
        " dbo.pengirim.kirim_info " +
        "FROM dbo.pengirim " +
        "INNER JOIN dbo.reseller ON dbo.pengirim.kode_reseller = dbo.reseller.kode " +
        "WHERE (dbo.pengirim.tipe_pengirim = 'S') " +
        "AND (dbo.pengirim.pengirim = '" + pengirim1 + "' " +
        "OR dbo.pengirim.pengirim = '" + pengirim2 + "')";

    console.info("[getPengirimByNomor] SQL Query:", query);

    const result = await runQuery(query);

    if (!result) {
        console.warn("[getPengirimByNomor] runQuery returned null → gagal ambil data");
        return null;
    }

    if (result.length === 0) {
        console.warn("[getPengirimByNomor] Nomor tidak ditemukan di tabel pengirim");
        return null;
    }

    console.log("[getPengirimByNomor] ✅ Data pengirim ditemukan:", result[0]);
    return result[0];
}

module.exports = { getPengirimByNomor };
