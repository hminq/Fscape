const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const AppError = require('../utils/AppError');
/**
 * Get paginated locations.
 */
const getAllLocations = async ({ page = 1, limit = 10, search, is_active } = {}) => {
    const { Location, Building, University } = sequelize.models;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
    }

    const { count, rows } = await Location.findAndCountAll({
        where,
        include: [
            { model: Building, as: 'buildings', attributes: ['id'] },
            { model: University, as: 'universities', attributes: ['id'] }
        ],
        limit: Number(limit),
        offset: Number(offset),
        distinct: true,
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
 * Get location details by ID.
 */
const getLocationById = async (id) => {
    const { Location, Building, University } = sequelize.models;

    const location = await Location.findByPk(id, {
        include: [
            { model: Building, as: 'buildings' },
            { model: University, as: 'universities' }
        ]
    });

    if (!location) throw new AppError('Không tìm thấy khu vực', 404);
    return location;
};

/**
 * Create a location.
 */
const createLocation = async (data) => {
    const { Location } = sequelize.models;
    const { name } = data;
    const normalizedName = name.trim();
    const existing = await Location.findOne({
        where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('name')),
            normalizedName.toLowerCase()
        )
    });
    if (existing) throw new AppError(`Khu vực "${normalizedName}" đã tồn tại`, 409);

    return await Location.create({ ...data, name: normalizedName });
};

/**
 * Update a location.
 */
const updateLocation = async (id, data) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id);
    if (!location) throw new AppError('Không tìm thấy khu vực', 404);

    if (data.name && data.name.trim() !== location.name) {
        const normalizedName = data.name.trim();
        const duplicate = await Location.findOne({
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
        if (duplicate) throw new AppError(`Khu vực "${normalizedName}" đã tồn tại`, 409);
    }

    // Restrict what can be updated via generic PUT (e.g., prevent changing is_active)
    const { is_active, ...allowedUpdateData } = data;

    return await location.update(allowedUpdateData);
};

/**
 * Delete a location.
 */
const deleteLocation = async (id) => {
    const { Location, Building, University } = sequelize.models;
    const location = await Location.findByPk(id);
    if (!location) throw new AppError('Không tìm thấy khu vực', 404);

    const [buildingsCount, universitiesCount] = await Promise.all([
        Building.count({ where: { location_id: id } }),
        University.count({ where: { location_id: id } })
    ]);

    if (buildingsCount > 0 || universitiesCount > 0) {
        throw new AppError('Không thể xóa khu vực: Vẫn còn dữ liệu liên kết.', 400);
    }

    await location.destroy();
    return { message: `Đã xóa khu vực "${location.name}" thành công` };
};

const toggleLocationStatus = async (id, isActive) => {
    const { Location } = sequelize.models;
    const location = await Location.findByPk(id)
    if (!location) throw new AppError('Không tìm thấy khu vực', 404);
    if (location.is_active === isActive) {
        throw new AppError(`Khu vực đã ở trạng thái ${isActive ? 'hoạt động' : 'vô hiệu hóa'}`, 400);
    }

    location.is_active = isActive
    await location.save()

    return location
}

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
};
