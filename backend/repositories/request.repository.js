const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const findRequestAccessPayload = (requestId) => {
  const { Request, Room } = getModels();

  return Request.findByPk(requestId, {
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "building_id"],
      },
    ],
  });
};

const countRequestsByNumberPrefix = (prefix) => {
  const { Request } = getModels();

  return Request.count({
    where: {
      request_number: { [Op.like]: `${prefix}%` },
    },
  });
};

const findAndCountRequests = (
  { page = 1, limit = 10, status, request_type, room_id, assigned_staff_id, search } = {},
  scope = {},
) => {
  const { Request, Room, User } = getModels();
  const offset = (page - 1) * limit;
  const where = {};
  const roomInclude = {
    model: Room,
    as: "room",
    attributes: ["id", "room_number", "floor", "building_id"],
  };

  if (status) {
    const statuses = status.split(",").map((item) => item.trim()).filter(Boolean);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (request_type) where.request_type = request_type;
  if (room_id) where.room_id = room_id;
  if (assigned_staff_id) where.assigned_staff_id = assigned_staff_id;

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { request_number: { [Op.iLike]: `%${search}%` } },
      sequelize.where(sequelize.col("room.room_number"), { [Op.iLike]: `%${search}%` }),
      sequelize.where(sequelize.col("resident.first_name"), { [Op.iLike]: `%${search}%` }),
      sequelize.where(sequelize.col("resident.last_name"), { [Op.iLike]: `%${search}%` }),
      sequelize.where(
        sequelize.fn(
          "concat",
          sequelize.col("resident.last_name"),
          " ",
          sequelize.col("resident.first_name"),
        ),
        { [Op.iLike]: `%${search}%` },
      ),
    ];
  }

  if (scope.buildingId) {
    roomInclude.where = { building_id: scope.buildingId };
    roomInclude.required = true;
  }

  if (scope.staffId) {
    where.assigned_staff_id = scope.staffId;
  }

  if (scope.residentId) {
    where.resident_id = scope.residentId;
  }

  return Request.findAndCountAll({
    where,
    include: [
      roomInclude,
      { model: User, as: "resident", attributes: ["id", "first_name", "last_name", "email"] },
      { model: User, as: "staff", attributes: ["id", "first_name", "last_name"] },
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [["createdAt", "DESC"]],
  });
};

const findAndCountMyRequests = (userId, { page = 1, limit = 10, status, request_type } = {}) => {
  const { Request, RequestImage, Room, Building, User } = getModels();
  const offset = (page - 1) * limit;
  const where = { resident_id: userId };

  if (status) {
    const statuses = status.split(",").map((item) => item.trim()).filter(Boolean);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (request_type) where.request_type = request_type;

  return Request.findAndCountAll({
    where,
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "building_id"],
        include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
      },
      { model: User, as: "staff", attributes: ["id", "first_name", "last_name"] },
      { model: RequestImage, as: "images" },
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [["createdAt", "DESC"]],
  });
};

const findRequestDetailById = (requestId) => {
  const { Request, RequestImage, RequestStatusHistory, Room, Building, User, Asset } = getModels();

  return Request.findByPk(requestId, {
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "building_id"],
        include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
      },
      { model: User, as: "resident", attributes: ["id", "first_name", "last_name", "phone", "email"] },
      { model: User, as: "staff", attributes: ["id", "first_name", "last_name", "phone"] },
      { model: Asset, as: "asset", attributes: ["id", "qr_code"] },
      { model: RequestImage, as: "images" },
      {
        model: RequestStatusHistory,
        as: "status_history",
        include: [{ model: User, as: "modifier", attributes: ["id", "first_name", "last_name", "role"] }],
      },
    ],
    order: [[{ model: RequestStatusHistory, as: "status_history" }, "created_at", "DESC"]],
  });
};

const findRoomById = (roomId, options = {}) => {
  const { Room } = getModels();

  return Room.findByPk(roomId, options);
};

const createRequest = (values, options = {}) => {
  const { Request } = getModels();

  return Request.create(values, options);
};

const bulkCreateRequestImages = (values, options = {}) => {
  const { RequestImage } = getModels();

  return RequestImage.bulkCreate(values, options);
};

const createStatusHistory = (values, options = {}) => {
  const { RequestStatusHistory } = getModels();

  return RequestStatusHistory.create(values, options);
};

const findStaffAssignmentCandidate = (staffId) => {
  const { User } = getModels();

  return User.findByPk(staffId, {
    attributes: ["id", "role", "building_id", "is_active"],
  });
};

const updateRequest = (request, values, options = {}) => {
  return request.update(values, options);
};

const findRequestsForStats = (buildingId) => {
  const { Request, Room } = getModels();
  const include = [];

  if (buildingId) {
    include.push({
      model: Room,
      as: "room",
      attributes: [],
      where: { building_id: buildingId },
      required: true,
    });
  }

  return Request.findAll({
    attributes: ["status", "request_type"],
    include,
    raw: true,
  });
};

module.exports = {
  findRequestAccessPayload,
  countRequestsByNumberPrefix,
  findAndCountRequests,
  findAndCountMyRequests,
  findRequestDetailById,
  findRoomById,
  createRequest,
  bulkCreateRequestImages,
  createStatusHistory,
  findStaffAssignmentCandidate,
  updateRequest,
  findRequestsForStats,
};
