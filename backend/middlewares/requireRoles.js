const AppError = require('../utils/AppError');

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện hành động này', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = requireRoles;
