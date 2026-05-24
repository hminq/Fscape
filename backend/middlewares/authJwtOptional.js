const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getRuntimeConfig } = require('../config/runtimeConfig');
const AppError = require('../utils/AppError');

module.exports = async function authJwtOptional(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = { role: 'PUBLIC' };
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { jwtSecret } = getRuntimeConfig();
        const payload = jwt.verify(token, jwtSecret);

        const user = await User.findByPk(payload.sub);
        if (!user) {
            req.user = { role: 'PUBLIC' };
            return next();
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
        // Treat invalid tokens as unauthenticatedg 
        req.user = { role: 'PUBLIC' };
        next();
    }
};
