const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const roomRepository = require('../repositories/room.repository');

const AppError = require('../utils/AppError');
const { ROLES } = require('../constants/roles');
const { generateRoomNumbers } = require('../utils/roomNumber.util');

// Booking/contract statuses that block delete or lock.
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'DEPOSIT_PAID'];
const ACTIVE_CONTRACT_STATUSES = [
  'DRAFT', 'PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE',
  'ACTIVE', 'EXPIRING_SOON'
];

// Fields stripped from detail response by role.
const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'deleted_at', 'createdAt', 'updatedAt', 'deletedAt'];

const buildRoomListFilters = (query = {}, user = {}) => {
  const {
    building_id,
    room_type_id,
    status,
    floor,
    search,
    capacity,
  } = query;

  const where = {};
  const roomTypeWhere = {};
  const roomTypeIds = String(room_type_id || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const normalizedCapacity = Number(capacity);

  if (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) {
    where.building_id = user.building_id;
  } else if (building_id) {
    where.building_id = building_id;
  }

  if (roomTypeIds.length === 1) {
    where.room_type_id = roomTypeIds[0];
  } else if (roomTypeIds.length > 1) {
    where.room_type_id = { [Op.in]: roomTypeIds };
  }

  if (status) where.status = status;
  if (floor !== undefined && floor !== '') where.floor = floor;
  if (search) where.room_number = { [Op.iLike]: `%${search}%` };
  if (Number.isFinite(normalizedCapacity) && normalizedCapacity > 0) {
    roomTypeWhere.capacity_max = { [Op.gte]: normalizedCapacity };
  }

  return { where, roomTypeWhere };
};

// GET /api/rooms
const getAllRooms = async (query = {}, user = {}) => {
  const {
    page = 1,
    limit = 10,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = query;
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.max(Number(limit) || 10, 1);
  const offset = (safePage - 1) * safeLimit;
  const sortDir = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const { where, roomTypeWhere } = buildRoomListFilters(query, user);

  const { count, rows } = await roomRepository.findAndCountRooms({
    where,
    roomTypeWhere,
    limit: safeLimit,
    offset: Number(offset),
    sortBy: sort_by,
    sortDir,
  });

  let data = rows;

  // Strip timestamps for non-admin roles
  if (user.role !== ROLES.ADMIN) {
    data = rows.map(row => {
      const obj = row.toJSON();
      for (const field of TIMESTAMP_FIELDS) delete obj[field];
      return obj;
    });
  }

  return {
    total: count,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(count / safeLimit),
    data
  };
};

// GET /api/rooms/facets
const getRoomFacets = async (query = {}, user = {}) => {
  const facetQuery = { ...query };
  delete facetQuery.room_type_id;

  const { where, roomTypeWhere } = buildRoomListFilters(facetQuery, user);

  const rows = await roomRepository.findRoomsForFacets({
    where,
    roomTypeWhere,
  });

  const roomTypeMap = new Map();
  rows.forEach((room) => {
    const type = room.room_type;
    if (!type?.id) return;
    const previous = roomTypeMap.get(type.id);
    roomTypeMap.set(type.id, {
      id: type.id,
      name: type.name || 'Loại phòng',
      count: (previous?.count || 0) + 1,
    });
  });

  return {
    data: {
      total: rows.length,
      room_types: Array.from(roomTypeMap.values()),
    }
  };
};

// GET /api/rooms/:id
const getRoomById = async (id, user = {}) => {
  const role = user.role || 'PUBLIC';

  const room = await roomRepository.findRoomDetailById(id);

  if (!room) throw new AppError('Không tìm thấy phòng', 404);

  // Building-scoped: BUILDING_MANAGER and STAFF can only see rooms in their building
  if (
    (role === ROLES.BUILDING_MANAGER || role === ROLES.STAFF) &&
    user.building_id !== room.building_id
  ) {
    throw new AppError('Bạn chỉ có thể xem phòng trong tòa nhà được phân công', 403);
  }

  const data = room.toJSON();

  // Fetch additional data based on role.
  if (role === ROLES.ADMIN || role === ROLES.BUILDING_MANAGER || role === ROLES.STAFF) {
    // 1. Find the current resident (user with an ACTIVE contract on this room)
    const activeContract = await roomRepository.findActiveContractForRoom(id);

    if (activeContract && activeContract.customer) {
      const resident = activeContract.customer;
      data.current_resident = resident;

      // 2. Fetch all requests made by this resident for this room
      if (role === ROLES.ADMIN || role === ROLES.STAFF) {
        data.resident_requests = await roomRepository.findResidentRequestsForRoom(id, resident.id);
      }

      // 3. Fetch all bookings and contracts made by this resident for this room
      if (role === ROLES.ADMIN || role === ROLES.BUILDING_MANAGER) {
        data.resident_bookings = await roomRepository.findResidentBookingsForRoom(id, resident.id);
        data.resident_contracts = await roomRepository.findResidentContractsForRoom(id, resident.id);
      }
    } else {
      data.current_resident = null;
      data.resident_requests = [];
      data.resident_bookings = [];
      data.resident_contracts = [];
    }
  }

  // Strip fields based on role.
  if (role === 'PUBLIC' || role === ROLES.RESIDENT || role === ROLES.CUSTOMER) {
    // Public/Resident: basic info only, no timestamps, no internal data
    for (const field of TIMESTAMP_FIELDS) delete data[field];
    if (data.building) {
      data.building = { id: data.building.id, name: data.building.name, address: data.building.address };
    }
    if (data.room_type) {
      data.room_type = {
        id: data.room_type.id,
        name: data.room_type.name,
        base_price: data.room_type.base_price,
        template_assets: data.room_type.template_assets || []
      };
    }
  } else if (role === ROLES.STAFF || role === ROLES.BUILDING_MANAGER) {
    // No timestamps
    for (const field of TIMESTAMP_FIELDS) delete data[field];
  }
  // ADMIN: no stripping - sees everything

  if (data.images) {
    data.images = data.images.map(img => img.image_url);
  }

  return data;
};

// POST /api/rooms
const createRoom = async (data) => {
  const { gallery_images, ...roomData } = data;

  const existingRoom = await roomRepository.findRoomByBuildingAndNumber(roomData.building_id, roomData.room_number);
  if (existingRoom) {
    throw new AppError(`Số phòng ${roomData.room_number} đã tồn tại trong tòa nhà này`, 409);
  }

  const transaction = await sequelize.transaction();
  try {
    const room = await roomRepository.createRoom(roomData, { transaction });

    if (gallery_images && gallery_images.length > 0) {
      const imageRecords = gallery_images.map(url => ({
        room_id: room.id,
        image_url: url
      }));
      await roomRepository.bulkCreateRoomImages(imageRecords, { transaction });
    }

    await transaction.commit();

    // Fetch the created room with minimal required relations
    const createdRoom = await roomRepository.findCreatedRoomById(room.id);

    const responseData = createdRoom.toJSON();
    if (responseData.images) {
      responseData.images = responseData.images.map(img => img.image_url);
    }

    return responseData;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// PUT /api/rooms/:id
const updateRoom = async (id, data) => {
  const { gallery_images, ...updateData } = data;

  const room = await roomRepository.findRoomById(id);
  if (!room) throw new AppError('Không tìm thấy phòng', 404);

  // Guard against changing fundamental identity parameters if there are active bookings or contracts
  const hasCriticalChanges = updateData.building_id || updateData.room_type_id || updateData.room_number;
  if (hasCriticalChanges) {
    const activeBooking = await roomRepository.findActiveBookingForRoom(id, ACTIVE_BOOKING_STATUSES);
    if (activeBooking) {
      throw new AppError('Không thể thay đổi tòa nhà, loại phòng hoặc số phòng khi phòng có đặt chỗ đang hoạt động', 409);
    }

    const activeContract = await roomRepository.findBlockingContractForRoom(id, ACTIVE_CONTRACT_STATUSES);
    if (activeContract) {
      throw new AppError('Không thể thay đổi tòa nhà, loại phòng hoặc số phòng khi phòng có hợp đồng đang hoạt động', 409);
    }
  }

  if (updateData.room_number && updateData.room_number !== room.room_number) {
    const existingRoom = await roomRepository.findRoomByBuildingAndNumber(room.building_id, updateData.room_number);
    if (existingRoom) {
      throw new AppError(`Số phòng ${updateData.room_number} đã tồn tại trong tòa nhà này`, 409);
    }
  }

  const transaction = await sequelize.transaction();
  try {
    await roomRepository.updateRoom(room, updateData, { transaction });

    if (gallery_images) {
      await roomRepository.deleteRoomImages(id, { transaction });
      if (gallery_images.length > 0) {
        const imageRecords = gallery_images.map(url => ({
          room_id: id,
          image_url: url
        }));
        await roomRepository.bulkCreateRoomImages(imageRecords, { transaction });
      }
    }

    await transaction.commit();
    return getRoomById(id, { role: ROLES.ADMIN });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// DELETE /api/rooms/:id (soft delete)
const deleteRoom = async (id) => {
  const room = await roomRepository.findRoomById(id);
  if (!room) throw new AppError('Không tìm thấy phòng', 404);

  // Guard: cannot delete if active bookings exist
  const activeBooking = await roomRepository.findActiveBookingForRoom(id, ACTIVE_BOOKING_STATUSES);
  if (activeBooking) {
    throw new AppError('Không thể xóa phòng có đặt chỗ đang hoạt động', 409);
  }

  // Guard: cannot delete if active contracts exist
  const activeContract = await roomRepository.findBlockingContractForRoom(id, ACTIVE_CONTRACT_STATUSES);
  if (activeContract) {
    throw new AppError('Không thể xóa phòng có hợp đồng đang hoạt động', 409);
  }

  await roomRepository.destroyRoom(room); // paranoid: sets deleted_at
  return { message: `Đã xóa phòng ${room.room_number} thành công` };
};

// PATCH /api/rooms/:id/status
const toggleRoomStatus = async (id, targetStatus, user) => {
  if (!['AVAILABLE', 'LOCKED'].includes(targetStatus)) {
    throw new AppError('Trạng thái phòng không hợp lệ', 400);
  }

  const room = await roomRepository.findRoomById(id);
  if (!room) throw new AppError('Không tìm thấy phòng', 404);

  // Building-scoped: managers can only toggle rooms in their building
  if (user.role === ROLES.BUILDING_MANAGER && user.building_id !== room.building_id) {
    throw new AppError('Bạn chỉ có thể quản lý phòng trong tòa nhà được phân công', 403);
  }

  if (room.status === targetStatus) {
    throw new AppError(`Phòng đã ở trạng thái ${targetStatus}`, 400);
  }

  // Can only lock AVAILABLE rooms, can only unlock LOCKED rooms
  if (targetStatus === 'LOCKED' && room.status !== 'AVAILABLE') {
    throw new AppError(`Không thể khóa phòng có trạng thái ${room.status}`, 409);
  }
  if (targetStatus === 'AVAILABLE' && room.status !== 'LOCKED') {
    throw new AppError(`Không thể mở khóa phòng có trạng thái ${room.status}`, 409);
  }

  // Guard: cannot lock if active bookings or contracts
  if (targetStatus === 'LOCKED') {
    const activeBooking = await roomRepository.findActiveBookingForRoom(id, ACTIVE_BOOKING_STATUSES);
    if (activeBooking) {
      throw new AppError('Không thể khóa phòng có đặt chỗ đang hoạt động', 409);
    }

    const activeContract = await roomRepository.findBlockingContractForRoom(id, ACTIVE_CONTRACT_STATUSES);
    if (activeContract) {
      throw new AppError('Không thể khóa phòng có hợp đồng đang hoạt động', 409);
    }
  }

  room.status = targetStatus;
  await roomRepository.saveRoom(room);
  return room;
};

const getRoomsByBuilding = async (building_id, query = {}, user = {}) => {

  const { status, floor, search } = query;

  const where = {
    building_id
  };

  if (status) where.status = status;
  if (floor !== undefined) where.floor = floor;
  if (search) where.room_number = { [Op.iLike]: `%${search}%` };

  // Building-scoped access
  if (
    (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) &&
    user.building_id !== building_id
  ) {
    throw new AppError('Bạn chỉ có thể xem phòng trong tòa nhà được phân công', 403);
  }

  const rooms = await roomRepository.findRoomsByBuilding({ where });

  let data = rooms.map(r => r.toJSON());

  // Strip timestamps for non-admin
  if (user.role !== ROLES.ADMIN) {
    data = data.map(room => {
      for (const field of TIMESTAMP_FIELDS) delete room[field];
      return room;
    });
  }

  // Convert images → array of urls
  data = data.map(room => {
    if (room.images) {
      room.images = room.images.map(img => img.image_url);
    }
    return room;
  });

  return data;
};

// GET /api/rooms/my for CUSTOMER/RESIDENT.
const getMyRooms = async (userId) => {
  // Find rooms where the user has an active contract
  const contracts = await roomRepository.findMyRoomContracts(userId);

  return contracts;
};

// POST /api/rooms/batch
const createBatchRooms = async ({
  building_id, room_type_id, floor, count,
  thumbnail_url, image_3d_url, blueprint_url, gallery_images
}) => {
  const building = await roomRepository.findBuildingById(building_id);
  if (!building) throw new AppError('Không tìm thấy tòa nhà', 404);

  const roomType = await roomRepository.findRoomTypeById(room_type_id);
  if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);

  const existingRooms = await roomRepository.findRoomNumbersByBuilding(building_id);
  const existingNumbers = existingRooms.map(r => r.room_number);

  const roomNumbers = generateRoomNumbers(floor, count, existingNumbers);

  const transaction = await sequelize.transaction();
  try {
    const records = roomNumbers.map(num => ({
      building_id,
      room_type_id,
      room_number: num,
      floor,
      status: 'AVAILABLE',
      thumbnail_url: thumbnail_url || null,
      image_3d_url: image_3d_url || null,
      blueprint_url: blueprint_url || null,
    }));

    const created = await roomRepository.bulkCreateRooms(records, { transaction });

    if (gallery_images && gallery_images.length > 0) {
      const imageRecords = created.flatMap(room =>
        gallery_images.map(url => ({ room_id: room.id, image_url: url }))
      );
      await roomRepository.bulkCreateRoomImages(imageRecords, { transaction });
    }

    await transaction.commit();

    return {
      count: created.length,
      room_numbers: roomNumbers,
      floor,
      building: { id: building.id, name: building.name },
      room_type: { id: roomType.id, name: roomType.name },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// GET /api/rooms/stats
const getRoomStats = async (user) => {
  const where = {};
  if (user && ['BUILDING_MANAGER', 'STAFF'].includes(user.role)) {
    where.building_id = user.building_id;
  }

  const rooms = await roomRepository.findRoomsForStats(where);

  const byStatus = { available: 0, occupied: 0, locked: 0 };
  const byBuilding = {};

  for (const r of rooms) {
    const key = r.status.toLowerCase();
    byStatus[key] = (byStatus[key] || 0) + 1;
    const bName = r.building?.name || 'Khác';
    const bId = r.building_id;
    if (!byBuilding[bId]) byBuilding[bId] = { building_id: bId, name: bName, count: 0 };
    byBuilding[bId].count++;
  }

  return {
    total: rooms.length,
    by_status: byStatus,
    by_building: Object.values(byBuilding).sort((a, b) => b.count - a.count),
  };
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  createBatchRooms,
  updateRoom,
  deleteRoom,
  toggleRoomStatus,
  getRoomsByBuilding,
  getMyRooms,
  getRoomStats
};
