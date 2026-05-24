const { INTERNAL_LOGIN_ROLES } = require('../constants/auth');
const AppError = require('../utils/AppError');

module.exports = function authorizeInternal(req, res, next) {
  if (!INTERNAL_LOGIN_ROLES.includes(req.user.role)) {
    return next(new AppError('Không có quyền truy cập', 403, 'FORBIDDEN'));
  }
  next();
};
