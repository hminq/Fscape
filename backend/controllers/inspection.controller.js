const inspectionService = require('../services/inspection.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const VALID_CONDITIONS = ['GOOD', 'BROKEN'];

function validateAssetsInput(assets) {
    if (!Array.isArray(assets) || assets.length === 0) {
        return 'assets[] is required and must be a non-empty array';
    }
    for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        if (!a.qr_code || typeof a.qr_code !== 'string') {
            return `assets[${i}].qr_code is required and must be a string`;
        }
        if (!VALID_CONDITIONS.includes(a.condition)) {
            return `assets[${i}].condition must be GOOD or BROKEN`;
        }
    }
    return null;
}

// Staff CHECK_OUT endpoints.

const previewInspection = asyncHandler(async (req, res) => {
        const { room_id, assets } = req.body;
        if (!room_id) {
            console.warn('[InspectionController] previewInspection: missing room_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            console.warn('[InspectionController] previewInspection:', validationError);
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const result = await inspectionService.previewInspection(room_id, assets, req.user);
        return res.status(200).json({ data: result });

});

const confirmInspection = asyncHandler(async (req, res) => {
        const { room_id, assets, notes } = req.body;
        if (!room_id) {
            console.warn('[InspectionController] confirmInspection: missing room_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            console.warn('[InspectionController] confirmInspection:', validationError);
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const result = await inspectionService.confirmInspection(room_id, assets, notes, req.user);
        return res.status(201).json({ message: 'Đã ghi nhận kiểm tra', data: result });

});

// Resident CHECK_IN endpoints.

const residentPreviewCheckIn = asyncHandler(async (req, res) => {
        const { contract_id, assets } = req.body;
        if (!contract_id) {
            console.warn('[InspectionController] residentPreviewCheckIn: missing contract_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            console.warn('[InspectionController] residentPreviewCheckIn:', validationError);
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const result = await inspectionService.residentPreviewCheckIn(contract_id, assets, req.user);
        return res.status(200).json({ data: result });

});

const residentConfirmCheckIn = asyncHandler(async (req, res) => {
        const { contract_id, assets, notes } = req.body;
        if (!contract_id) {
            console.warn('[InspectionController] residentConfirmCheckIn: missing contract_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const validationError = validateAssetsInput(assets);
        if (validationError) {
            console.warn('[InspectionController] residentConfirmCheckIn:', validationError);
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const result = await inspectionService.residentConfirmCheckIn(contract_id, assets, notes, req.user);
        return res.status(201).json({ message: 'Check-in thành công', data: result });

});

// GET /api/inspections?room_id=

const getInspectionsByRoom = asyncHandler(async (req, res) => {
        const { room_id, contract_id } = req.query;
        if (!room_id) {
            throw new AppError('Vui lòng chọn phòng', 400, 'ROOM_REQUIRED');
        }
        const result = await inspectionService.getInspectionsByRoom(room_id, req.user, { contractId: contract_id });
        return res.status(200).json({ data: result });

});

module.exports = { previewInspection, confirmInspection, residentPreviewCheckIn, residentConfirmCheckIn, getInspectionsByRoom };
