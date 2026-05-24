const jwt = require('jsonwebtoken');
const { getRuntimeConfig } = require('../config/runtimeConfig');

const generateAccessToken = (user) => {
  const { jwtSecret } = getRuntimeConfig();
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    jwtSecret,
    {
      expiresIn: '1h'
    }
  );
};

module.exports = {
  generateAccessToken
};
