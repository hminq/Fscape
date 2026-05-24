const assetService = require('../services/asset.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getAllAssets = asyncHandler(async (req, res) => {
        const result = await assetService.getAllAssets(req.query, req.user);
        return res.status(200).json({ ...result });

});

const getAssetById = asyncHandler(async (req, res) => {
        const asset = await assetService.getAssetById(req.params.id, req.user);
        return res.status(200).json({ data: asset });

});

const createAsset = asyncHandler(async (req, res) => {
        const { name, building_id } = req.body;
        if (!name || !building_id) {
            console.warn('[AssetController] createAsset: missing name or building_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const asset = await assetService.createAsset(req.body);
        return res.status(201).json({ message: 'Tạo tài sản thành công', data: asset });

});

const createBatchAssets = asyncHandler(async (req, res) => {
        const { name, building_id, asset_type_id, quantity, price } = req.body;
        if (!name || !building_id) {
            console.warn('[AssetController] createBatchAssets: missing name or building_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const result = await assetService.createBatchAssets({ name, building_id, asset_type_id, quantity, price });
        return res.status(201).json({ message: `Đã tạo thành công ${result.count} tài sản`, ...result });

});

const updateAsset = asyncHandler(async (req, res) => {
        const asset = await assetService.updateAsset(req.params.id, req.body, req.user);
        return res.status(200).json({ message: 'Cập nhật tài sản thành công', data: asset });

});

const assignAsset = asyncHandler(async (req, res) => {
        const { room_id, notes } = req.body;
        const asset = await assetService.assignAsset(req.params.id, { room_id: room_id || null, notes }, req.user);
        return res.status(200).json({ message: 'Gán tài sản thành công', data: asset });

});

const deleteAsset = asyncHandler(async (req, res) => {
        const result = await assetService.deleteAsset(req.params.id);
        return res.status(200).json({ ...result });

});

const getAssetStats = asyncHandler(async (req, res) => {
        const stats = await assetService.getAssetStats(req.user);
        return res.status(200).json({ data: stats });

});

module.exports = { getAllAssets, getAssetById, createAsset, createBatchAssets, updateAsset, assignAsset, deleteAsset, getAssetStats };
