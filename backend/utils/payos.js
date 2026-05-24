const { PayOS } = require("@payos/node");
const { getRuntimeConfig } = require("../config/runtimeConfig");

// Lazy initialization: create instance only when configured.
let _payos = null;

function getPayOS() {
    if (!_payos) {
        getRuntimeConfig();
        _payos = new PayOS();
    }
    return _payos;
}

module.exports = getPayOS;
