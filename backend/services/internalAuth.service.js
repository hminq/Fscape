const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { AuthProvider } = require("../models/authProvider.model");
const { INTERNAL_LOGIN_ROLES } = require("../constants/auth");
const { getRuntimeConfig } = require("../config/runtimeConfig");
const AppError = require('../utils/AppError');

class InternalAuthService {
  // ========= LOGIN =========
  static async login({ email, password }) {
    if (!email || !password) {
      throw new AppError("Vui lòng nhập email và mật khẩu", 400, "MISSING_CREDENTIALS");
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError("Không tìm thấy email này", 401, "INVALID_CREDENTIALS");
    }

    if (!INTERNAL_LOGIN_ROLES.includes(user.role)) {
      throw new AppError("Tài khoản không được phép đăng nhập tại đây. Vui lòng sử dụng trang đăng nhập dành cho khách hàng", 403, "FORBIDDEN");
    }

    if (!user.is_active) {
      throw new AppError("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên", 403, "ACCOUNT_DISABLED");
    }

    const auth = await AuthProvider.findOne({
      where: {
        user_id: user.id,
        provider: "EMAIL",
      },
    });

    if (!auth || !auth.password_hash) {
      throw new AppError("Tài khoản chưa thiết lập mật khẩu. Vui lòng liên hệ quản trị viên", 400, "PASSWORD_NOT_SET");
    }

    const match = await bcrypt.compare(password, auth.password_hash);
    if (!match) {
      throw new AppError("Mật khẩu không chính xác", 401, "INVALID_CREDENTIALS");
    }

    const { jwtSecret } = getRuntimeConfig();
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "1d" },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        building_id: user.building_id,
      },
    };
  }

  // ========= CHANGE PASSWORD =========
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("Không tìm thấy người dùng", 404, "USER_NOT_FOUND");
    }

    if (!INTERNAL_LOGIN_ROLES.includes(user.role)) {
      throw new AppError("Tài khoản không được phép đổi mật khẩu tại đây", 403, "FORBIDDEN");
    }

    const auth = await AuthProvider.findOne({
      where: {
        user_id: user.id,
        provider: "EMAIL",
      },
    });

    if (!auth || !auth.password_hash) {
      throw new AppError("Phương thức xác thực không hợp lệ", 400, "INVALID_AUTH_PROVIDER");
    }

    const match = await bcrypt.compare(oldPassword, auth.password_hash);
    if (!match) {
      throw new AppError("Mật khẩu cũ không chính xác", 400, "INVALID_OLD_PASSWORD");
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await auth.update({
      password_hash: newHash,
    });

    return true;
  }
}

module.exports = InternalAuthService;
