const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { REQUEST_SERVICE_BILLING_STATUS } = require("../constants/invoiceEnums");

const getModels = () => sequelize.models;

const findCheckoutRequest = (roomId, staffId) => {
  const { Request } = getModels();

  return Request.findOne({
    where: {
      room_id: roomId,
      request_type: "CHECKOUT",
      status: "IN_PROGRESS",
      assigned_staff_id: staffId,
    },
  });
};

const findAssetsByQrCodes = (qrCodes) => {
  const { Asset, AssetType } = getModels();

  if (!qrCodes || qrCodes.length === 0) return Promise.resolve([]);
  return Asset.findAll({
    where: { qr_code: { [Op.in]: qrCodes } },
    include: [{ model: AssetType, as: "asset_type", attributes: ["id", "name", "default_price"] }],
  });
};

const findContractWithRoomById = (contractId) => {
  const { Contract, Room } = getModels();

  return Contract.findByPk(contractId, {
    include: [{ model: Room, as: "room" }],
  });
};

const findRoomTypeAssetTemplate = (roomTypeId) => {
  const { RoomTypeAsset, AssetType } = getModels();

  return RoomTypeAsset.findAll({
    where: { room_type_id: roomTypeId },
    include: [{ model: AssetType, as: "asset_type", attributes: ["id", "name", "default_price"] }],
  });
};

const findAssetsInRoom = (roomId) => {
  const { Asset, AssetType } = getModels();

  return Asset.findAll({
    where: { current_room_id: roomId },
    include: [{ model: AssetType, as: "asset_type", attributes: ["id", "name", "default_price"] }],
  });
};

const findRoomById = (roomId, options = {}) => {
  const { Room } = getModels();

  return Room.findByPk(roomId, options);
};

const findLatestContractForRoom = (roomId, options = {}) => {
  const { Contract } = getModels();

  return Contract.findOne({
    where: {
      room_id: roomId,
      status: { [Op.in]: ["ACTIVE", "EXPIRING_SOON", "FINISHED"] },
    },
    order: [["created_at", "DESC"]],
    ...options,
  });
};

const findUnbilledServiceRequestsForRoom = (roomId, options = {}) => {
  const { Request } = getModels();

  return Request.findAll({
    where: {
      room_id: roomId,
      status: { [Op.in]: ["COMPLETED", "DONE"] },
      service_billing_status: REQUEST_SERVICE_BILLING_STATUS.UNBILLED,
      request_price: { [Op.gt]: 0 },
    },
    ...options,
  });
};

const createInspection = (values, options = {}) => {
  const { AssetInspection } = getModels();

  return AssetInspection.create(values, options);
};

const bulkCreateInspectionItems = (values, options = {}) => {
  const { AssetInspectionItem } = getModels();

  return AssetInspectionItem.bulkCreate(values, options);
};

const bulkCreateAssetHistory = (values, options = {}) => {
  const { AssetHistory } = getModels();

  return AssetHistory.bulkCreate(values, options);
};

const updateAssetsByIds = (assetIds, values, options = {}) => {
  const { Asset } = getModels();

  return Asset.update(values, { where: { id: { [Op.in]: assetIds } }, ...options });
};

const updateContract = (contract, values, options = {}) => {
  return contract.update(values, options);
};

const countOtherActiveContracts = (customerId, contractId, options = {}) => {
  const { Contract } = getModels();

  return Contract.count({
    where: {
      customer_id: customerId,
      id: { [Op.ne]: contractId },
      status: { [Op.in]: ["ACTIVE", "EXPIRING_SOON"] },
    },
    ...options,
  });
};

const updateResidentToCustomer = (customerId, options = {}) => {
  const { User } = getModels();

  return User.update(
    { role: "CUSTOMER" },
    { where: { id: customerId, role: "RESIDENT" }, ...options },
  );
};

const updateRoomStatus = (roomId, status, options = {}) => {
  const { Room } = getModels();

  return Room.update({ status }, { where: { id: roomId }, ...options });
};

const findResidentContract = (userId, contractId, statuses) => {
  const { Contract, Room } = getModels();

  return Contract.findOne({
    where: {
      id: contractId,
      customer_id: userId,
      status: { [Op.in]: statuses },
    },
    include: [{ model: Room, as: "room" }],
  });
};

const updateContractById = (contractId, values, options = {}) => {
  const { Contract } = getModels();

  return Contract.update(values, { where: { id: contractId }, ...options });
};

const countContractsForRoomAndCustomer = (roomId, customerId) => {
  const { Contract } = getModels();

  return Contract.count({
    where: { room_id: roomId, customer_id: customerId },
  });
};

const findInspectionsByRoom = (roomId) => {
  const { AssetInspection, AssetInspectionItem, Asset, AssetType, User } = getModels();

  return AssetInspection.findAll({
    where: { room_id: roomId },
    order: [["created_at", "ASC"]],
    include: [
      { model: User, as: "performer", attributes: ["id", "first_name", "last_name", "email"] },
      {
        model: AssetInspectionItem,
        as: "items",
        include: [
          {
            model: Asset,
            as: "asset",
            include: [{ model: AssetType, as: "asset_type", attributes: ["id", "name"] }],
          },
        ],
      },
    ],
  });
};

module.exports = {
  findCheckoutRequest,
  findAssetsByQrCodes,
  findContractWithRoomById,
  findRoomTypeAssetTemplate,
  findAssetsInRoom,
  findRoomById,
  findLatestContractForRoom,
  findUnbilledServiceRequestsForRoom,
  createInspection,
  bulkCreateInspectionItems,
  bulkCreateAssetHistory,
  updateAssetsByIds,
  updateContract,
  countOtherActiveContracts,
  updateResidentToCustomer,
  updateRoomStatus,
  findResidentContract,
  updateContractById,
  countContractsForRoomAndCustomer,
  findInspectionsByRoom,
};
