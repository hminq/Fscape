const { Op } = require('sequelize');
const AssetType = require('../models/assetType.model');
const { sequelize } = require('../config/db');
const Asset = require('../models/asset.model');
const { ROLES } = require('../constants/roles');

const AppError = require('../utils/AppError');
const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'createdAt', 'updatedAt'];

const getAllAssetTypes = async (query = {}, user = {}) => {
    const { page = 1, limit = 10, search, is_active } = query;
    const offset = (page - 1) * limit;
    const where = {};

    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
    }
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await AssetType.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']]
    });

    let data = rows;
    if (user.role !== ROLES.ADMIN) {
        data = rows.map(row => {
            const obj = row.toJSON();
            for (const field of TIMESTAMP_FIELDS) delete obj[field];
            return obj;
        });
    }

    const active_count = await AssetType.count({
        where: { ...where, is_active: true }
    });

    return {
        total: count,
        active_count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data
    };
};

const getAssetTypeById = async (id, user = {}) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw new AppError('Không tìm thấy loại tài sản', 404);

    if (user.role !== ROLES.ADMIN) {
        const data = assetType.toJSON();
        for (const field of TIMESTAMP_FIELDS) delete data[field];
        return data;
    }
    return assetType;
};

const createAssetType = async (data) => {
    if (!data.name) {
        throw new AppError('Tên loại tài sản là bắt buộc', 400);
    }

    const normalizedName = data.name.trim();
    const duplicate = await AssetType.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (duplicate) {
        throw new AppError(`Loại tài sản "${normalizedName}" đã tồn tại`, 409);
    }

    if (data.default_price !== undefined && data.default_price < 0) {
        throw new AppError('Giá mặc định phải từ 0 trở lên', 400);
    }

    return AssetType.create({ ...data, name: normalizedName });
};

const updateAssetType = async (id, data) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw new AppError('Không tìm thấy loại tài sản', 404);

    if (data.name && data.name.trim() !== assetType.name) {
        const normalizedName = data.name.trim();
        const duplicate = await AssetType.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        normalizedName.toLowerCase()
                    ),
                    { id: { [Op.ne]: id } }
                ]
            }
        });
        if (duplicate) {
            throw new AppError(`Loại tài sản "${normalizedName}" đã tồn tại`, 409);
        }
        data.name = normalizedName;
    }

    if (data.default_price !== undefined && data.default_price < 0) {
        throw new AppError('Giá mặc định phải từ 0 trở lên', 400);
    }

    await assetType.update(data);
    return assetType;
};

const deleteAssetType = async (id) => {
    const assetType = await AssetType.findByPk(id);
    if (!assetType) throw new AppError('Không tìm thấy loại tài sản', 404);

    // Check if any assets are using this type
    const count = await Asset.count({ where: { asset_type_id: id } });
    if (count > 0) {
        throw new AppError(`Không thể xóa loại tài sản đang có ${count} tài sản sử dụng. Vui lòng gán lại loại tài sản cho các tài sản đó trước.`, 400);
    }

    await assetType.destroy();
    return { message: `Đã xóa loại tài sản "${assetType.name}" thành công` };
};

// GET /api/asset-types/stats
const getAssetTypeStats = async () => {
    const all = await AssetType.findAll({
        attributes: ['is_active'],
        raw: true,
    });

    let active = 0, inactive = 0;
    for (const r of all) {
        if (r.is_active) active++;
        else inactive++;
    }

    return {
        total: all.length,
        by_status: { active, inactive },
    };
};

module.exports = { getAllAssetTypes, getAssetTypeById, createAssetType, updateAssetType, deleteAssetType, getAssetTypeStats };
