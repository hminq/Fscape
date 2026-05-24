const { Op } = require('sequelize');
const University = require('../models/university.model');
const { sequelize } = require('../config/db');
const Location = require('../models/location.model');
const Building = require('../models/building.model');

const AppError = require('../utils/AppError');
/**
 * Get paginated universities with location data.
 */
const getAllUniversities = async ({ page = 1, limit = 10, location_id, is_active, search } = {}) => {
    const offset = (page - 1) * limit;
    const where = {};

    if (location_id) where.location_id = location_id;
    if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await University.findAndCountAll({
        where,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [
            { model: Location, as: 'location', attributes: ['id', 'name'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
        order: [['name', 'ASC']]
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

/**
 * Get university details and nearby buildings in the same location.
 */
const getUniversityById = async (id) => {
    const university = await University.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [
            {
                model: Location,
                as: 'location',
                attributes: { exclude: ['createdAt', 'updatedAt', 'is_active'] }
            }
        ]
    });

    if (!university) throw new AppError('Không tìm thấy trường đại học', 404);

    const nearbyBuildings = await Building.findAll({
        where: {
            location_id: university.location_id,
            is_active: true
        },
        attributes: ['id', 'name', 'address', 'thumbnail_url', 'latitude', 'longitude']
    });

    const universityData = university.toJSON();
    universityData.nearby_buildings = nearbyBuildings;

    return universityData;
};

const createUniversity = async (data) => {
    const { name, location_id, address } = data;

    if (!name) throw new AppError('Tên trường đại học là bắt buộc', 400);
    if (!location_id) throw new AppError('Mã khu vực là bắt buộc', 400);
    if (!address) throw new AppError('Địa chỉ là bắt buộc', 400);

    const normalizedName = name.trim();
    const existing = await University.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (existing) throw new AppError(`Trường đại học "${normalizedName}" đã tồn tại`, 409);

    return await University.create({ ...data, name: normalizedName });
};

const updateUniversity = async (id, data) => {
    const university = await University.findByPk(id);
    if (!university) throw new AppError('Không tìm thấy trường đại học', 404);

    if (data.name !== undefined && !data.name) throw new AppError('Tên trường đại học không được để trống', 400);
    if (data.location_id !== undefined && !data.location_id) throw new AppError('Mã khu vực không được để trống', 400);
    if (data.address !== undefined && !data.address) throw new AppError('Địa chỉ không được để trống', 400);

    if (data.name && data.name.trim() !== university.name) {
        const normalizedName = data.name.trim();
        const duplicate = await University.findOne({
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
        if (duplicate) throw new AppError('Tên trường đại học đã tồn tại', 409);
    }

    // Restrict what can be updated via generic PUT
    const { is_active, ...allowedUpdateData } = data;

    return await university.update(allowedUpdateData);
};

const deleteUniversity = async (id) => {
    const university = await University.findByPk(id);
    if (!university) throw new AppError('Không tìm thấy trường đại học', 404);

    await university.destroy();
    return { message: `Đã xóa trường đại học "${university.name}" thành công` };
};

const toggleUniversityStatus = async (id, isActive) => {
    const university = await University.findByPk(id)
    if (!university) throw new AppError('Không tìm thấy trường đại học', 404);
    if (university.is_active === isActive) {
        throw new AppError(`Trường đại học đã ở trạng thái ${isActive ? 'hoạt động' : 'ngừng hoạt động'}`, 400);
    }

    university.is_active = isActive
    await university.save()

    return university
}

module.exports = {
    getAllUniversities,
    getUniversityById,
    createUniversity,
    updateUniversity,
    deleteUniversity,
    toggleUniversityStatus
};