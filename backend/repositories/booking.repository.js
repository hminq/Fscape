const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const findRoomForBooking = (roomId, options = {}) => {
  const { Room, RoomType } = getModels();

  return Room.findByPk(roomId, {
    include: [{ model: RoomType, as: "room_type", required: true }],
    ...options,
  });
};

const findRoomTypeById = (roomTypeId, options = {}) => {
  const { RoomType } = getModels();

  return RoomType.findByPk(roomTypeId, options);
};

const findOrCreateCustomerProfile = (userId, defaults, options = {}) => {
  const { CustomerProfile } = getModels();

  return CustomerProfile.findOrCreate({
    where: { user_id: userId },
    defaults,
    ...options,
  });
};

const updateCustomerProfile = (profile, values, options = {}) => {
  return profile.update(values, options);
};

const createPendingBooking = (values, options = {}) => {
  const { Booking } = getModels();

  return Booking.create(values, options);
};

const updateRoomStatus = (roomId, status, options = {}) => {
  const { Room } = getModels();

  return Room.update({ status }, { where: { id: roomId }, ...options });
};

const updateRoomInstanceStatus = (room, status, options = {}) => {
  return room.update({ status }, options);
};

const findMyBookings = (userId, query = {}) => {
  const { Booking, Room, Building, RoomType, Contract } = getModels();
  const {
    page = 1,
    limit = 10,
    sort_by = "created_at",
    sort_order = "DESC",
    status,
    search,
  } = query;

  const offset = (page - 1) * limit;
  const where = { customer_id: userId };

  if (status === "active") {
    where.status = { [Op.in]: ["PENDING", "DEPOSIT_PAID"] };
  } else if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.booking_number = { [Op.iLike]: `%${search}%` };
  }

  const sortColumnMap = {
    created_at: "createdAt",
    check_in_date: "check_in_date",
    room_price_snapshot: "room_price_snapshot",
    status: "status",
  };
  const sortCol = sortColumnMap[sort_by] || "createdAt";
  const sortDir = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  return Booking.findAndCountAll({
    where,
    attributes: [
      "id",
      "booking_number",
      "status",
      "check_in_date",
      "duration_months",
      "room_price_snapshot",
      "deposit_amount",
      "deposit_paid_at",
      "expires_at",
      "cancelled_at",
      "cancellation_reason",
      "contract_id",
      "createdAt",
    ],
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "thumbnail_url"],
        include: [
          {
            model: Building,
            as: "building",
            attributes: ["id", "name", "address"],
          },
          {
            model: RoomType,
            as: "room_type",
            attributes: ["id", "name", "area_sqm", "bedrooms", "bathrooms"],
          },
        ],
      },
      {
        model: Contract,
        as: "contract",
        attributes: ["id", "status"],
        required: false,
      },
    ],
    distinct: true,
    limit: Number(limit),
    offset: Number(offset),
    order: [[sortCol, sortDir]],
  });
};

const findByIdWithDetails = (bookingId) => {
  const { Booking, Room, Building, RoomType, User, CustomerProfile } = getModels();

  return Booking.findByPk(bookingId, {
    include: [
      {
        model: Room,
        as: "room",
        include: [
          { model: Building, as: "building" },
          { model: RoomType, as: "room_type" },
        ],
      },
      {
        model: User,
        as: "customer",
        attributes: ["id", "first_name", "last_name", "email", "phone", "avatar_url"],
        include: [
          {
            model: CustomerProfile,
            as: "profile",
            attributes: ["gender", "date_of_birth", "permanent_address"],
          },
        ],
      },
    ],
  });
};

const findAllWithFilters = (filters = {}, options = {}) => {
  const { Booking, Room, Building, RoomType, User, CustomerProfile } = getModels();
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const offset = (page - 1) * limit;
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.booking_number) {
    where.booking_number = { [Op.iLike]: `%${filters.booking_number}%` };
  }

  if (filters.search) {
    where[Op.or] = [
      { booking_number: { [Op.iLike]: `%${filters.search}%` } },
      { "$customer.first_name$": { [Op.iLike]: `%${filters.search}%` } },
      { "$customer.last_name$": { [Op.iLike]: `%${filters.search}%` } },
      { "$room.room_number$": { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const buildingWhere =
    options.buildingId
      ? { id: options.buildingId }
      : filters.building_id
        ? { id: filters.building_id }
        : filters.building_name
          ? { name: { [Op.iLike]: `%${filters.building_name}%` } }
          : undefined;

  const include = [
    {
      model: Room,
      as: "room",
      attributes: ["id", "room_number", "floor", "thumbnail_url"],
      where: filters.room_number
        ? { room_number: { [Op.iLike]: `%${filters.room_number}%` } }
        : undefined,
      include: [
        {
          model: Building,
          as: "building",
          attributes: ["id", "name", "address"],
          where: buildingWhere,
        },
        {
          model: RoomType,
          as: "room_type",
          attributes: ["id", "name", "area_sqm", "bedrooms", "bathrooms"],
        },
      ],
    },
    {
      model: User,
      as: "customer",
      attributes: ["id", "first_name", "last_name", "email", "phone"],
      where: filters.customer_name
        ? {
            [Op.or]: [
              { first_name: { [Op.iLike]: `%${filters.customer_name}%` } },
              { last_name: { [Op.iLike]: `%${filters.customer_name}%` } },
              { email: { [Op.iLike]: `%${filters.customer_name}%` } },
            ],
          }
        : undefined,
      include: [
        {
          model: CustomerProfile,
          as: "profile",
          attributes: ["gender", "date_of_birth", "permanent_address"],
        },
      ],
    },
  ];

  include.forEach((item) => {
    if (item.where === undefined) delete item.where;
    if (item.include) {
      item.include.forEach((nested) => {
        if (nested.where === undefined) delete nested.where;
      });
    }
  });

  return Booking.findAndCountAll({
    attributes: [
      "id",
      "booking_number",
      "status",
      "check_in_date",
      "duration_months",
      "room_price_snapshot",
      "deposit_amount",
      "deposit_paid_at",
      "expires_at",
      "cancelled_at",
      "cancellation_reason",
      "createdAt",
    ],
    include,
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
    subQuery: false,
  });
};

const findByIdForUpdate = (bookingId, transaction) => {
  const { Booking } = getModels();

  return Booking.findByPk(bookingId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

const updateBooking = (booking, values, options = {}) => {
  return booking.update(values, options);
};

module.exports = {
  findRoomForBooking,
  findRoomTypeById,
  findOrCreateCustomerProfile,
  updateCustomerProfile,
  createPendingBooking,
  updateRoomStatus,
  updateRoomInstanceStatus,
  findMyBookings,
  findByIdWithDetails,
  findAllWithFilters,
  findByIdForUpdate,
  updateBooking,
};
