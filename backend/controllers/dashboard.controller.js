const DashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');

exports.getDashboard = asyncHandler(async (req, res) => {
    const dashboard = await DashboardService.getDashboard(req.user);
    return res.json({ data: dashboard });

});

exports.getBuildingManagerDashboard = asyncHandler(async (req, res) => {
    const dashboard = await DashboardService.getBuildingManagerDashboard(req.user);
    return res.json({ data: dashboard });

});
