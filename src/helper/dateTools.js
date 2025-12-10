// src/helper/dateTools.js
const datefomat = require("dateformat");

function getSqlDateFormat(date) {
    return datefomat(date, "yyyy-mm-dd HH:MM:ss");
}

module.exports = { getSqlDateFormat };
