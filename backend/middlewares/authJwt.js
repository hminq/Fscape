const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getRuntimeConfig } = require('../config/runtimeConfig');
const AppError = require('../utils/AppError');

module.exports = async function authJwt(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Bạn cần đăng nhập để tiếp tục', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { jwtSecret } = getRuntimeConfig();
    const payload = jwt.verify(token, jwtSecret);

    const user = await User.findByPk(payload.sub);
    if (!user) {
      return next(new AppError('Bạn cần đăng nhập để tiếp tục', 401, 'UNAUTHORIZED'));
    }

    if (!user.is_active) {
      return next(new AppError('Tài khoản đã bị vô hiệu hóa', 403, 'ACCOUNT_DISABLED'));
    }

    req.user = {
      id: user.id,
      role: user.role,
      building_id: user.building_id,
    };

    next();
  } catch {
    return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN'));
  }
};
