const AppError = require('../utils/AppError');

const DEFAULT_CLIENT_MESSAGES = {
  400: 'Yêu cầu không hợp lệ',
  401: 'Bạn cần đăng nhập để tiếp tục',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy tài nguyên',
  409: 'Dữ liệu đang xung đột',
  422: 'Dữ liệu không hợp lệ',
  500: 'Đã xảy ra lỗi hệ thống',
};

function getStatus(error) {
  const status = Number(error?.status || error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 600) return status;
  return 500;
}

function getCode(error, status) {
  if (typeof error?.code === 'string' && error.code.trim()) return error.code;
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'REQUEST_ERROR';
}

function getClientMessage(error, status) {
  if (status >= 500) return DEFAULT_CLIENT_MESSAGES[500];

  if (isClientSafe(error) && typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return DEFAULT_CLIENT_MESSAGES[status] || DEFAULT_CLIENT_MESSAGES[400];
}

function isClientSafe(error) {
  return Boolean(error?.isOperational || error instanceof AppError);
}

function normalizeSequelizeError(error) {
  if (!error?.name) return null;

  if (error.name === 'SequelizeValidationError') {
    return new AppError('Dữ liệu không hợp lệ', 422, 'VALIDATION_ERROR');
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return new AppError('Dữ liệu đã tồn tại', 409, 'DUPLICATE_VALUE');
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Dữ liệu liên quan không hợp lệ', 400, 'INVALID_RELATION');
  }

  if (error.name === 'SequelizeDatabaseError') {
    return new AppError('Đã xảy ra lỗi hệ thống', 500, 'DATABASE_ERROR');
  }

  return null;
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const normalizedError = normalizeSequelizeError(error) || error || {};
  const status = getStatus(normalizedError);

  if (status >= 500) {
    console.error('GlobalErrorHandler:', {
      method: req.method,
      path: req.originalUrl,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
    });
  }

  const body = {
    message: getClientMessage(normalizedError, status),
    code: getCode(normalizedError, status),
  };

  const exposeDetails = status < 500 && isClientSafe(normalizedError);

  if (exposeDetails && normalizedError.details !== undefined) {
    body.details = normalizedError.details;
  }

  if (exposeDetails && normalizedError.details?.errors !== undefined) {
    body.errors = normalizedError.details.errors;
  }

  if (exposeDetails && normalizedError.errors !== undefined) {
    body.errors = normalizedError.errors;
  }

  if (exposeDetails && normalizedError.data !== undefined) {
    body.data = normalizedError.data;
  }

  return res.status(status).json(body);
}

module.exports = errorHandler;
