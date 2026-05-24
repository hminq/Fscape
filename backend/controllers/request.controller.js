const requestService = require('../services/request.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getAllRequests = asyncHandler(async (req, res) => {
        const result = await requestService.getAllRequests(req.user, req.query);
        return res.status(200).json({ ...result });

});

const getMyRequests = asyncHandler(async (req, res) => {
        const result = await requestService.getMyRequests(req.user.id, req.query);
        return res.status(200).json({ ...result });

});

const getRequestById = asyncHandler(async (req, res) => {
        const request = await requestService.getRequestById(req.user, req.params.id);
        return res.status(200).json({ data: request });

});

// Resident creates a request.
const createRequest = asyncHandler(async (req, res) => {
        const requestData = { ...req.body };

        // Force resident_id from JWT
        requestData.resident_id = req.user.id;

        if (!requestData.room_id || !requestData.request_type || !requestData.title) {
            console.warn('[RequestController] createRequest: missing required fields');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        // image_urls now comes pre-uploaded from the client
        requestData.imageUrls = requestData.image_urls || [];

        const request = await requestService.createRequest(requestData);

        return res.status(201).json({
            message: 'Tạo yêu cầu thành công',
            data: request
        });

});

// Manager assigns request to staff.
const assignRequest = asyncHandler(async (req, res) => {
        const { assigned_staff_id } = req.body;

        if (!assigned_staff_id) {
            console.warn('[RequestController] assignRequest: missing assigned_staff_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const request = await requestService.assignRequest(req.params.id, assigned_staff_id, req.user);

        return res.status(200).json({
            message: 'Phân công yêu cầu thành công',
            data: request
        });

});

const updateRequestStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = { ...req.body };

        updateData.changed_by = req.user.id;
        updateData.caller_role = req.user.role;

        if (!updateData.status) {
            console.warn('[RequestController] updateRequestStatus: missing status');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        updateData.completionImages = updateData.completion_images || [];

        const request = await requestService.updateRequestStatus(id, updateData, req.user);

        return res.status(200).json({
            message: 'Cập nhật trạng thái yêu cầu thành công',
            data: request
        });

});

const getRequestStats = asyncHandler(async (req, res) => {
        const stats = await requestService.getRequestStats(req.user);
        return res.status(200).json({ data: stats });

});

module.exports = {
    getAllRequests,
    getMyRequests,
    getRequestById,
    createRequest,
    assignRequest,
    updateRequestStatus,
    getRequestStats
};
