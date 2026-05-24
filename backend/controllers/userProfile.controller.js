const userService = require('../services/userProfile.service');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfileById(req.user.id);
    res.json({ data: user });

});

exports.updateProfile = asyncHandler(async (req, res) => {
    const user = await userService.updateProfileById(req.user.id, req.body);
    res.json({ data: user });

});
