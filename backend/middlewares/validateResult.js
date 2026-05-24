const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return next(new AppError(errorList[0]?.msg || 'Dữ liệu không hợp lệ', 422, 'VALIDATION_ERROR', { errors: errorList }));
  }
  next();
};
