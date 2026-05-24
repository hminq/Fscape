const InternalAuthService = require('../services/internalAuth.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


exports.login = asyncHandler(async (req, res) => {
    const result = await InternalAuthService.login(req.body);
    res.json(result);

});

exports.changePassword = asyncHandler(async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      throw new AppError('Vui lòng nhập mật khẩu cũ và mật khẩu mới', 400, 'MISSING_PASSWORD');
    }

    await InternalAuthService.changePassword(
      req.user.id,
      old_password,
      new_password
    );

    res.json({
      message: 'Đổi mật khẩu thành công',
    });

});
