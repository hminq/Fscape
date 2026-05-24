const AdminUserService = require('../services/adminUser.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


exports.createUser = asyncHandler(async (req, res) => {
    const user = await AdminUserService.createInternalUser(req.body);
    return res.status(201).json(user);

});

exports.listUsers = asyncHandler(async (req, res) => {
    const users = await AdminUserService.getUsers(req.user, req.query);
    return res.json({ data: users });

});

exports.getUserStats = asyncHandler(async (req, res) => {
    const stats = await AdminUserService.getUserStats(req.user);
    return res.json({ data: stats });

});

exports.getAvailableManagers = asyncHandler(async (req, res) => {
    const managers = await AdminUserService.getAvailableManagers();
    return res.json({ data: managers });

});

exports.updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      console.warn('[AdminUserController] updateUserStatus: is_active is not boolean');
      throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
    }

    const user = await AdminUserService.updateUserStatus(id, is_active);

    return res.json({
      message: 'Cập nhật trạng thái người dùng thành công',
      data: {
        id: user.id,
        is_active: user.is_active,
      },
    });

});

exports.assignBuilding = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { building_id } = req.body;

    if (building_id !== null && typeof building_id !== 'string') {
      console.warn('[AdminUserController] assignBuilding: building_id must be UUID string or null');
      throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
    }

    const user = await AdminUserService.assignBuilding(id, building_id);

    return res.json({
      message: 'Cập nhật phân công tòa nhà thành công',
      data: {
        id: user.id,
        building_id: user.building_id,
        role: user.role,
      },
    });

});

exports.resetPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await AdminUserService.resetPassword(id);
    return res.json(result);

});
