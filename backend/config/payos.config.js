const { getRuntimeConfig } = require("./runtimeConfig");

const { payos } = getRuntimeConfig();

module.exports = {
    clientId: payos.clientId,
    apiKey: payos.apiKey,
    checksumKey: payos.checksumKey,
    returnUrl: payos.returnUrl,
    cancelUrl: payos.cancelUrl,
};
