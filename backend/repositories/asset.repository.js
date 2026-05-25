const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const assetInclude = () => {
  const { Building, Room, AssetType } = getModels();

  return [
    { model: Building, as: "building", attributes: ["id", "name"] },
    { model: Room, as: "room", attributes: ["id", "room_number", "floor", "building_id"] },
    { model: AssetType, as: "asset_type", attributes: ["id", "name"] },
  ];
};

const findAssets = ({ where }) => {
  const { Asset, Building, Room } = getModels();

  return Asset.findAll({
    where,
    include: assetInclude(),
    order: [
      [{ model: Building, as: "building" }, "name", "ASC"],
      [{ model: Room, as: "room" }, "floor", "ASC"],
      ["createdAt", "DESC"],
    ],
  });
};

const findAndCountAssets = ({ where, limit, offset }) => {
  const { Asset } = getModels();

  return Asset.findAndCountAll({
    where,
    include: assetInclude(),
    distinct: true,
    limit: Number(limit),
    offset,
    order: [["createdAt", "DESC"]],
  });
};

const findAssetDetailById = (assetId) => {
  const { Asset, AssetHistory, Building, Room } = getModels();

  return Asset.findByPk(assetId, {
    include: [
      { model: Building, as: "building" },
      { model: Room, as: "room" },
      {
        model: AssetHistory,
        as: "histories",
        limit: 10,
        order: [["createdAt", "DESC"]],
      },
    ],
  });
};

const findBuildingById = (buildingId) => {
  const { Building } = getModels();

  return Building.findByPk(buildingId);
};

const findRoomById = (roomId) => {
  const { Room } = getModels();

  return Room.findByPk(roomId);
};

const findAssetTypeById = (assetTypeId) => {
  const { AssetType } = getModels();

  return AssetType.findByPk(assetTypeId);
};

const createAsset = (values, options = {}) => {
  const { Asset } = getModels();

  return Asset.create(values, options);
};

const createAssetHistory = (values, options = {}) => {
  const { AssetHistory } = getModels();

  return AssetHistory.create(values, options);
};

const findAssetById = (assetId) => {
  const { Asset } = getModels();

  return Asset.findByPk(assetId);
};

const updateAsset = (asset, values, options = {}) => {
  return asset.update(values, options);
};

const findActiveMaintenanceRequestForAsset = (assetId) => {
  const { Request } = getModels();

  return Request.findOne({
    where: {
      related_asset_id: assetId,
      status: { [Op.notIn]: ["COMPLETED", "CANCELLED", "REVIEWED"] },
    },
  });
};

const destroyAsset = (asset) => {
  return asset.destroy();
};

const findAssetsForStats = (where = {}) => {
  const { Asset, Building } = getModels();

  return Asset.findAll({
    where,
    attributes: ["status", "building_id"],
    include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
    raw: true,
    nest: true,
  });
};

module.exports = {
  findAssets,
  findAndCountAssets,
  findAssetDetailById,
  findBuildingById,
  findRoomById,
  findAssetTypeById,
  createAsset,
  createAssetHistory,
  findAssetById,
  updateAsset,
  findActiveMaintenanceRequestForAsset,
  destroyAsset,
  findAssetsForStats,
};
