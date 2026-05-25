const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const findAndCountRooms = ({ where, roomTypeWhere, limit, offset, sortBy, sortDir }) => {
  const { Room, Building, RoomType } = getModels();
  const allowedSorts = {
    created_at: ["createdAt"],
    price: [{ model: RoomType, as: "room_type" }, "base_price"],
  };
  const sortPath = allowedSorts[sortBy] || allowedSorts.created_at;

  return Room.findAndCountAll({
    where,
    include: [
      { model: Building, as: "building", attributes: ["id", "name"] },
      {
        model: RoomType,
        as: "room_type",
        attributes: ["id", "name", "base_price", "capacity_min", "capacity_max", "area_sqm", "bedrooms", "bathrooms"],
        where: roomTypeWhere,
      },
    ],
    limit,
    offset,
    order: [[...sortPath, sortDir]],
  });
};

const findRoomsForFacets = ({ where, roomTypeWhere }) => {
  const { Room, RoomType } = getModels();

  return Room.findAll({
    where,
    attributes: ["id", "room_type_id"],
    include: [
      {
        model: RoomType,
        as: "room_type",
        attributes: ["id", "name"],
        where: roomTypeWhere,
      },
    ],
    raw: false,
  });
};

const findRoomDetailById = (roomId) => {
  const { Room, RoomImage, Building, RoomType, RoomTypeAsset, AssetType } = getModels();

  return Room.findByPk(roomId, {
    include: [
      { model: Building, as: "building" },
      {
        model: RoomType,
        as: "room_type",
        include: [
          {
            model: RoomTypeAsset,
            as: "template_assets",
            attributes: ["id", "quantity"],
            include: [
              {
                model: AssetType,
                as: "asset_type",
                attributes: ["id", "name"],
                where: { is_active: true },
                required: false,
              },
            ],
          },
        ],
      },
      { model: RoomImage, as: "images", attributes: ["id", "image_url"] },
    ],
  });
};

const findActiveContractForRoom = (roomId) => {
  const { Contract, User } = getModels();

  return Contract.findOne({
    where: { room_id: roomId, status: { [Op.in]: ["PENDING_FIRST_PAYMENT", "PENDING_CHECK_IN", "ACTIVE", "EXPIRING_SOON"] } },
    include: [{ model: User, as: "customer", attributes: ["id", "first_name", "last_name", "email", "phone", "avatar_url"] }],
  });
};

const findResidentRequestsForRoom = (roomId, residentId) => {
  const { Request } = getModels();

  return Request.findAll({
    where: { room_id: roomId, resident_id: residentId },
    attributes: ["id", "request_number", "title", "status", "request_type", "created_at"],
    order: [["createdAt", "DESC"]],
  });
};

const findResidentBookingsForRoom = (roomId, residentId) => {
  const { Booking } = getModels();

  return Booking.findAll({
    where: { room_id: roomId, customer_id: residentId },
    attributes: ["id", "booking_number", "status", "check_in_date", "expires_at"],
    order: [["createdAt", "DESC"]],
  });
};

const findResidentContractsForRoom = (roomId, residentId) => {
  const { Contract } = getModels();

  return Contract.findAll({
    where: { room_id: roomId, customer_id: residentId },
    attributes: ["id", "contract_number", "status", "start_date", "end_date", "base_rent", "term_type"],
    order: [["createdAt", "DESC"]],
  });
};

const findRoomById = (roomId, options = {}) => {
  const { Room } = getModels();

  return Room.findByPk(roomId, options);
};

const findRoomByBuildingAndNumber = (buildingId, roomNumber) => {
  const { Room } = getModels();

  return Room.findOne({
    where: { building_id: buildingId, room_number: roomNumber },
  });
};

const createRoom = (values, options = {}) => {
  const { Room } = getModels();

  return Room.create(values, options);
};

const bulkCreateRoomImages = (values, options = {}) => {
  const { RoomImage } = getModels();

  return RoomImage.bulkCreate(values, options);
};

const findCreatedRoomById = (roomId) => {
  const { Room, RoomImage, Building, RoomType } = getModels();

  return Room.findByPk(roomId, {
    include: [
      { model: Building, as: "building" },
      { model: RoomType, as: "room_type" },
      { model: RoomImage, as: "images", attributes: ["image_url"] },
    ],
  });
};

const findActiveBookingForRoom = (roomId, statuses) => {
  const { Booking } = getModels();

  return Booking.findOne({
    where: { room_id: roomId, status: { [Op.in]: statuses } },
  });
};

const findBlockingContractForRoom = (roomId, statuses) => {
  const { Contract } = getModels();

  return Contract.findOne({
    where: { room_id: roomId, status: { [Op.in]: statuses } },
  });
};

const updateRoom = (room, values, options = {}) => {
  return room.update(values, options);
};

const deleteRoomImages = (roomId, options = {}) => {
  const { RoomImage } = getModels();

  return RoomImage.destroy({ where: { room_id: roomId }, ...options });
};

const saveRoom = (room) => {
  return room.save();
};

const destroyRoom = (room) => {
  return room.destroy();
};

const findRoomsByBuilding = ({ where }) => {
  const { Room, RoomImage, RoomType } = getModels();

  return Room.findAll({
    where,
    include: [
      {
        model: RoomType,
        as: "room_type",
        attributes: ["id", "name", "base_price", "capacity_min", "capacity_max", "area_sqm"],
      },
      {
        model: RoomImage,
        as: "images",
        attributes: ["image_url"],
      },
    ],
    order: [
      ["floor", "ASC"],
      ["room_number", "ASC"],
    ],
  });
};

const findMyRoomContracts = (userId) => {
  const { Contract, Room, Building, RoomType, Asset } = getModels();

  return Contract.findAll({
    where: {
      customer_id: userId,
      status: { [Op.in]: ["PENDING_CHECK_IN", "ACTIVE", "EXPIRING_SOON"] },
    },
    attributes: ["id", "contract_number", "status", "start_date", "end_date", "base_rent"],
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "thumbnail_url", "status"],
        include: [
          {
            model: Building,
            as: "building",
            attributes: ["id", "name", "address", "thumbnail_url"],
          },
          {
            model: RoomType,
            as: "room_type",
            attributes: ["id", "name", "area_sqm", "bedrooms", "bathrooms", "capacity_max"],
          },
          {
            model: Asset,
            as: "assets",
            attributes: ["id", "name", "status", "qr_code"],
            where: { status: "IN_USE" },
            required: false,
          },
        ],
      },
    ],
    order: [["start_date", "DESC"]],
  });
};

const findBuildingById = (buildingId) => {
  const { Building } = getModels();

  return Building.findByPk(buildingId);
};

const findRoomTypeById = (roomTypeId) => {
  const { RoomType } = getModels();

  return RoomType.findByPk(roomTypeId);
};

const findRoomNumbersByBuilding = (buildingId) => {
  const { Room } = getModels();

  return Room.findAll({
    where: { building_id: buildingId },
    attributes: ["room_number"],
    raw: true,
  });
};

const bulkCreateRooms = (values, options = {}) => {
  const { Room } = getModels();

  return Room.bulkCreate(values, options);
};

const findRoomsForStats = (where = {}) => {
  const { Room, Building } = getModels();

  return Room.findAll({
    attributes: ["status", "building_id"],
    where,
    include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
    raw: true,
    nest: true,
  });
};

module.exports = {
  findAndCountRooms,
  findRoomsForFacets,
  findRoomDetailById,
  findActiveContractForRoom,
  findResidentRequestsForRoom,
  findResidentBookingsForRoom,
  findResidentContractsForRoom,
  findRoomById,
  findRoomByBuildingAndNumber,
  createRoom,
  bulkCreateRoomImages,
  findCreatedRoomById,
  findActiveBookingForRoom,
  findBlockingContractForRoom,
  updateRoom,
  deleteRoomImages,
  saveRoom,
  destroyRoom,
  findRoomsByBuilding,
  findMyRoomContracts,
  findBuildingById,
  findRoomTypeById,
  findRoomNumbersByBuilding,
  bulkCreateRooms,
  findRoomsForStats,
};
