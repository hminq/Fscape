const { ROLES } = require('../constants/roles');
const AppError = require('../utils/AppError');

module.exports = function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return next(new AppError('Cần quyền quản trị viên', 403, 'ADMIN_REQUIRED'));
  }
  next();
};
