const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const buildingRepository = require('../repositories/building.repository');
const { ROLES } = require('../constants/roles');

const AppError = require('../utils/AppError');
const ACTIVE_CONTRACT_STATUSES = [
    'DRAFT', 'PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE',
    'PENDING_FIRST_PAYMENT', 'PENDING_CHECK_IN',
    'ACTIVE', 'EXPIRING_SOON'
];
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'DEPOSIT_PAID'];

const getAllBuildings = async ({ page = 1, limit = 10, location_id, search, is_active } = {}, user) => {
    const offset = (page - 1) * limit;
    const where = {};
    const userRole = user?.role || 'PUBLIC';

    // Block Managers and Staff from standard generic /buildings list list 
    // Usually they use a specialized manager portal or get their assigned building directly.
    if (userRole === 'BUILDING_MANAGER' || userRole === 'STAFF') {
        throw new AppError('Quản lý và nhân viên phải sử dụng endpoint tòa nhà được phân công', 403);
    }

    // Public attributes - exclude timestamps for non-admin
    const publicBuildingAttrs = [
        'id', 'location_id', 'name', 'address', 'latitude', 'longitude',
        'description', 'total_floors', 'thumbnail_url', 'is_active'
    ];
    let attributes = undefined; // Admin gets everything
    let facilityThroughAttributes = [];
    let locationAttributes = ['id', 'name'];

    if (userRole !== 'ADMIN') {
        attributes = [...publicBuildingAttrs, 'createdAt']; // keep createdAt for ORDER BY
        facilityThroughAttributes = [];
        locationAttributes = { exclude: ['createdAt', 'updatedAt', 'is_active'] };
    }

    if (location_id) where.location_id = location_id;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await buildingRepository.findAndCountBuildings({
        where,
        attributes,
        locationAttributes,
        facilityThroughAttributes,
        limit: Number(limit),
        offset: Number(offset),
    });

    // Strip createdAt from public response (it was only kept for ORDER BY)
    const data = userRole !== 'ADMIN'
        ? rows.map(r => { const j = r.toJSON(); delete j.createdAt; return j; })
        : rows;

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data
    };
};

const getBuildingById = async (id, user) => {
    const userRole = user?.role || 'PUBLIC';

    // Block Managers and Staff from fetching any random building if it's not theirs
    if (userRole === 'BUILDING_MANAGER' || userRole === 'STAFF') {
        throw new AppError('Quản lý và nhân viên phải sử dụng endpoint tòa nhà được phân công', 403);
    }

    const publicBuildingAttrs = [
        'id', 'location_id', 'name', 'address', 'latitude', 'longitude',
        'description', 'total_floors', 'thumbnail_url', 'is_active'
    ];
    let attributes = undefined;
    let locationAttributes = undefined;
    let facilityThroughAttributes = [];

    if (userRole !== 'ADMIN') {
        attributes = publicBuildingAttrs;
        locationAttributes = { exclude: ['createdAt', 'updatedAt', 'is_active'] };
        facilityThroughAttributes = [];
    }

    const building = await buildingRepository.findBuildingDetailById({
        id,
        attributes,
        locationAttributes,
        facilityThroughAttributes,
    });

    if (!building) throw new AppError('Không tìm thấy tòa nhà', 404);

    const rooms = await buildingRepository.findRoomsByBuilding(id);

    const uniqueRoomTypeIds = [...new Set(rooms.map(room => room.room_type_id))];

    let roomTypes = [];
    if (uniqueRoomTypeIds.length > 0) {
        roomTypes = await buildingRepository.findRoomTypesByIds(uniqueRoomTypeIds);
    }

    const nearbyUniversities = await buildingRepository.findActiveUniversitiesByLocation(building.location_id);

    const buildingData = building.toJSON();
    buildingData.nearby_universities = nearbyUniversities;
    buildingData.rooms = rooms;
    buildingData.room_types = roomTypes;

    return buildingData;
};

const createBuilding = async (data) => {
    const { facilities, images, manager_id, ...buildingData } = data;

    if (images && images.length > 5) {
        throw new AppError('Tối đa 5 ảnh', 400);
    }

    if (facilities && facilities.length > 20) {
        throw new AppError('Một tòa nhà chỉ được gán tối đa 20 tiện ích', 400);
    }

    if (buildingData.total_floors !== undefined && buildingData.total_floors !== null &&
        (buildingData.total_floors < 1 || buildingData.total_floors > 99)) {
        throw new AppError('Số tầng phải từ 1 đến 99', 400);
    }

    // Check for duplicate building name (trim and ignore case)
    const normalizedName = buildingData.name.trim();
    const existing = await buildingRepository.findBuildingByNameInsensitive(normalizedName);
    if (existing) {
        throw new AppError(`Tòa nhà "${normalizedName}" đã tồn tại`, 409);
    }

    // Validate manager if provided
    if (manager_id) {
        const manager = await buildingRepository.findUserById(manager_id);
        if (!manager) throw new AppError('Không tìm thấy quản lý', 404);
        if (manager.role !== 'BUILDING_MANAGER') throw new AppError('Người dùng được chọn không phải quản lý tòa nhà', 400);
        if (!manager.is_active) throw new AppError('Quản lý được chọn đã bị vô hiệu hóa', 400);
        if (manager.building_id) throw new AppError('Quản lý được chọn đã được phân công tòa nhà khác', 400);
    }

    const transaction = await sequelize.transaction();

    try {
        const building = await buildingRepository.createBuilding(buildingData, { transaction });

        if (images && images.length > 0) {
            const imageRecords = images.map(url => ({ building_id: building.id, image_url: url }));
            await buildingRepository.bulkCreateBuildingImages(imageRecords, { transaction });
        }

        if (facilities && facilities.length > 0) {
            const facilityRecords = facilities.map(fId => ({ building_id: building.id, facility_id: fId }));
            await buildingRepository.bulkCreateBuildingFacilities(facilityRecords, { transaction });
        }

        if (manager_id) {
            await buildingRepository.updateUsersByWhere({ building_id: building.id }, { id: manager_id }, { transaction });
        }

        await transaction.commit();
        return getBuildingById(building.id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const updateBuilding = async (id, data) => {
    const { facilities, images, is_active, ...updateData } = data;

    if (images && images.length > 5) {
        throw new AppError('Tối đa 5 ảnh', 400);
    }

    if (facilities && facilities.length > 20) {
        throw new AppError('Một tòa nhà chỉ được gán tối đa 20 tiện ích', 400);
    }

    if (updateData.total_floors !== undefined && updateData.total_floors !== null &&
        (updateData.total_floors < 1 || updateData.total_floors > 99)) {
        throw new AppError('Số tầng phải từ 1 đến 99', 400);
    }

    const building = await buildingRepository.findBuildingById(id);
    if (!building) throw new AppError('Không tìm thấy tòa nhà', 404);

    // Check for duplicate name if renaming (trim and ignore case)
    if (updateData.name && updateData.name.trim() !== building.name) {
        const normalizedName = updateData.name.trim();
        const duplicate = await buildingRepository.findBuildingDuplicateByName(normalizedName, id);
        if (duplicate) throw new AppError('Tên tòa nhà đã tồn tại', 409);
    }

    const transaction = await sequelize.transaction();
    try {
        await buildingRepository.updateBuilding(building, updateData, { transaction });

        // Sync Images
        if (images) {
            await buildingRepository.deleteBuildingImages(id, { transaction });
            await buildingRepository.bulkCreateBuildingImages(images.map(url => ({ building_id: id, image_url: url })), { transaction });
        }

        // Sync Facilities
        if (facilities) {
            await buildingRepository.deleteBuildingFacilities(id, { transaction });
            await buildingRepository.bulkCreateBuildingFacilities(facilities.map(fId => ({ building_id: id, facility_id: fId })), { transaction });
        }

        await transaction.commit();
        return getBuildingById(id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const deleteBuilding = async (id) => {
    const building = await buildingRepository.findBuildingById(id);
    if (!building) throw new AppError('Không tìm thấy tòa nhà', 404);

    // Prevent deletion if the building has existing rooms associated with it
    const roomsCount = await buildingRepository.countRoomsByBuilding(id);
    if (roomsCount > 0) {
        throw new AppError(`Không thể xóa tòa nhà vì đang chứa ${roomsCount} phòng. Vui lòng xóa các phòng trước.`, 400);
    }

    // Unassign manager/staff before deletion to avoid FK constraint violation
    await buildingRepository.updateUsersByWhere({ building_id: null }, { building_id: id });

    await buildingRepository.destroyBuilding(building);
    return { message: `Đã xóa tòa nhà "${building.name}" thành công` };
};

const toggleBuildingStatus = async (id, isActive, user) => {
    const building = await buildingRepository.findBuildingById(id)
    if (!building) throw new AppError('Không tìm thấy tòa nhà', 404);
    if (user && user.role === 'BUILDING_MANAGER' && user.building_id !== building.id) {
        throw new AppError('Bạn chỉ được quản lý tòa nhà được phân công', 403);
    }

    if (building.is_active === isActive) {
        throw new AppError(`Tòa nhà đã ở trạng thái ${isActive ? 'hoạt động' : 'ngừng hoạt động'}`, 400);
    }

    // Block disabling if building has active contracts or bookings
    if (!isActive) {
        const roomIds = (await buildingRepository.findRoomIdsByBuilding(id)).map(r => r.id);

        if (roomIds.length > 0) {
            const activeContracts = await buildingRepository.countActiveContractsByRoomIds(roomIds, ACTIVE_CONTRACT_STATUSES);
            if (activeContracts > 0) {
                throw new AppError(`Không thể vô hiệu hóa tòa nhà. Hiện có ${activeContracts} hợp đồng đang hoạt động.`, 409);
            }

            const activeBookings = await buildingRepository.countActiveBookingsByRoomIds(roomIds, ACTIVE_BOOKING_STATUSES);
            if (activeBookings > 0) {
                throw new AppError(`Không thể vô hiệu hóa tòa nhà. Hiện có ${activeBookings} đặt phòng đang chờ xử lý.`, 409);
            }
        }
    }

    building.is_active = isActive
    await buildingRepository.saveBuilding(building)

    return building
}

const getStaffsByBuilding = async (buildingId) => {
  return buildingRepository.findActiveStaffByBuilding(buildingId);
};

const getBuildingStats = async () => {
    const buildings = await buildingRepository.findBuildingsForStats();

    let active = 0;
    let inactive = 0;
    const byLocation = {};

    for (const b of buildings) {
        if (b.is_active) active++;
        else inactive++;

        const locName = b.location?.name || 'Khác';
        const locId = b.location_id;
        if (!byLocation[locId]) byLocation[locId] = { location_id: locId, name: locName, count: 0 };
        byLocation[locId].count++;
    }

    const by_location = Object.values(byLocation).sort((a, b) => b.count - a.count);

    return { total: buildings.length, active, inactive, by_location };
};

module.exports = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingStatus,
    getStaffsByBuilding,
    getBuildingStats
};
