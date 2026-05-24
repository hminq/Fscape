// utils/google.util.js
const { OAuth2Client } = require('google-auth-library');
const { getRuntimeConfig } = require('../config/runtimeConfig');

const { google } = getRuntimeConfig();
const client = new OAuth2Client(google.clientId);

exports.verifyGoogleIdToken = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: google.clientId,
  });

  return ticket.getPayload();
};
