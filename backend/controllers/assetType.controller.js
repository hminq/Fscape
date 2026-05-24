const assetTypeService = require('../services/assetType.service');
const asyncHandler = require('../utils/asyncHandler');


const getAllAssetTypes = asyncHandler(async (req, res) => {
        const result = await assetTypeService.getAllAssetTypes(req.query, req.user);
        return res.status(200).json({ ...result });

});

const getAssetTypeById = asyncHandler(async (req, res) => {
        const data = await assetTypeService.getAssetTypeById(req.params.id, req.user);
        return res.status(200).json({ data });

});

const createAssetType = asyncHandler(async (req, res) => {
        const data = await assetTypeService.createAssetType(req.body);
        return res.status(201).json({ message: 'Tạo loại tài sản thành công', data });

});

const updateAssetType = asyncHandler(async (req, res) => {
        const data = await assetTypeService.updateAssetType(req.params.id, req.body);
        return res.status(200).json({ message: 'Cập nhật loại tài sản thành công', data });

});

const deleteAssetType = asyncHandler(async (req, res) => {
        const result = await assetTypeService.deleteAssetType(req.params.id);
        return res.status(200).json({ ...result });

});

const getAssetTypeStats = asyncHandler(async (req, res) => {
        const stats = await assetTypeService.getAssetTypeStats();
        return res.status(200).json({ data: stats });

});

module.exports = { getAllAssetTypes, getAssetTypeById, createAssetType, updateAssetType, deleteAssetType, getAssetTypeStats };
