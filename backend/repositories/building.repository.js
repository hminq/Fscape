const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { ROLES } = require("../constants/roles");

const getModels = () => sequelize.models;

const findAndCountBuildings = ({ where, attributes, locationAttributes, facilityThroughAttributes, limit, offset }) => {
  const { Building, Location, BuildingImage, Facility } = getModels();

  return Building.findAndCountAll({
    where,
    attributes,
    include: [
      { model: Location, as: "location", attributes: locationAttributes },
      { model: BuildingImage, as: "images", attributes: ["id", "image_url"] },
      { model: Facility, as: "facilities", through: { attributes: facilityThroughAttributes } },
    ],
    limit: Number(limit),
    offset: Number(offset),
    distinct: true,
    order: [["createdAt", "DESC"]],
  });
};

const findBuildingDetailById = ({ id, attributes, locationAttributes, facilityThroughAttributes }) => {
  const { Building, Location, BuildingImage, Facility, User } = getModels();

  return Building.findByPk(id, {
    attributes,
    include: [
      { model: Location, as: "location", attributes: locationAttributes },
      { model: BuildingImage, as: "images", attributes: ["id", "image_url"] },
      { model: Facility, as: "facilities", through: { attributes: facilityThroughAttributes } },
      {
        model: User,
        as: "manager",
        attributes: ["id", "email", "first_name", "last_name", "phone", "avatar_url", "is_active"],
        where: { role: "BUILDING_MANAGER" },
        required: false,
      },
    ],
  });
};

const findRoomsByBuilding = (buildingId) => {
  const { Room } = getModels();

  return Room.findAll({
    where: { building_id: buildingId },
    order: [
      ["floor", "ASC"],
      ["room_number", "ASC"],
    ],
  });
};

const findRoomTypesByIds = (roomTypeIds) => {
  const { RoomType } = getModels();

  return RoomType.findAll({
    where: { id: roomTypeIds },
  });
};

const findActiveUniversitiesByLocation = (locationId) => {
  const { University } = getModels();

  return University.findAll({
    where: { location_id: locationId, is_active: true },
    attributes: ["id", "name", "address", "latitude", "longitude"],
  });
};

const findBuildingByNameInsensitive = (name) => {
  const { Building } = getModels();

  return Building.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("name")),
      name.toLowerCase(),
    ),
  });
};

const findBuildingDuplicateByName = (name, excludeId) => {
  const { Building } = getModels();

  return Building.findOne({
    where: {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("name")),
          name.toLowerCase(),
        ),
        { id: { [Op.ne]: excludeId } },
      ],
    },
  });
};

const findUserById = (userId) => {
  const { User } = getModels();

  return User.findByPk(userId);
};

const createBuilding = (values, options = {}) => {
  const { Building } = getModels();

  return Building.create(values, options);
};

const bulkCreateBuildingImages = (values, options = {}) => {
  const { BuildingImage } = getModels();

  return BuildingImage.bulkCreate(values, options);
};

const bulkCreateBuildingFacilities = (values, options = {}) => {
  const { BuildingFacility } = getModels();

  return BuildingFacility.bulkCreate(values, options);
};

const updateUsersByWhere = (values, where, options = {}) => {
  const { User } = getModels();

  return User.update(values, { where, ...options });
};

const findBuildingById = (buildingId) => {
  const { Building } = getModels();

  return Building.findByPk(buildingId);
};

const updateBuilding = (building, values, options = {}) => {
  return building.update(values, options);
};

const deleteBuildingImages = (buildingId, options = {}) => {
  const { BuildingImage } = getModels();

  return BuildingImage.destroy({ where: { building_id: buildingId }, ...options });
};

const deleteBuildingFacilities = (buildingId, options = {}) => {
  const { BuildingFacility } = getModels();

  return BuildingFacility.destroy({ where: { building_id: buildingId }, ...options });
};

const countRoomsByBuilding = (buildingId) => {
  const { Room } = getModels();

  return Room.count({ where: { building_id: buildingId } });
};

const destroyBuilding = (building) => {
  return building.destroy();
};

const findRoomIdsByBuilding = (buildingId) => {
  const { Room } = getModels();

  return Room.findAll({
    where: { building_id: buildingId },
    attributes: ["id"],
    raw: true,
  });
};

const countActiveContractsByRoomIds = (roomIds, statuses) => {
  const { Contract } = getModels();

  return Contract.count({
    where: { room_id: { [Op.in]: roomIds }, status: { [Op.in]: statuses } },
  });
};

const countActiveBookingsByRoomIds = (roomIds, statuses) => {
  const { Booking } = getModels();

  return Booking.count({
    where: { room_id: { [Op.in]: roomIds }, status: { [Op.in]: statuses } },
  });
};

const saveBuilding = (building) => {
  return building.save();
};

const findActiveStaffByBuilding = (buildingId) => {
  const { User } = getModels();

  return User.findAll({
    where: {
      building_id: buildingId,
      role: ROLES.STAFF,
      is_active: true,
    },
    attributes: ["id", "email", "first_name", "last_name", "phone", "avatar_url", "is_active"],
    order: [["createdAt", "DESC"]],
  });
};

const findBuildingsForStats = () => {
  const { Building, Location } = getModels();

  return Building.findAll({
    attributes: ["location_id", "is_active"],
    include: [{ model: Location, as: "location", attributes: ["id", "name"] }],
    raw: true,
    nest: true,
  });
};

module.exports = {
  findAndCountBuildings,
  findBuildingDetailById,
  findRoomsByBuilding,
  findRoomTypesByIds,
  findActiveUniversitiesByLocation,
  findBuildingByNameInsensitive,
  findBuildingDuplicateByName,
  findUserById,
  createBuilding,
  bulkCreateBuildingImages,
  bulkCreateBuildingFacilities,
  updateUsersByWhere,
  findBuildingById,
  updateBuilding,
  deleteBuildingImages,
  deleteBuildingFacilities,
  countRoomsByBuilding,
  destroyBuilding,
  findRoomIdsByBuilding,
  countActiveContractsByRoomIds,
  countActiveBookingsByRoomIds,
  saveBuilding,
  findActiveStaffByBuilding,
  findBuildingsForStats,
};
