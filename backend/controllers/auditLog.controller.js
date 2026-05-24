const AuditLogService = require('../services/auditLog.service');
const asyncHandler = require('../utils/asyncHandler');


exports.list = asyncHandler(async (req, res) => {
    const result = await AuditLogService.list(req.user, req.query);
    return res.json(result);

});

exports.getEntityTypes = asyncHandler(async (req, res) => {
    const types = await AuditLogService.getEntityTypes();
    return res.json({ data: types });

});
