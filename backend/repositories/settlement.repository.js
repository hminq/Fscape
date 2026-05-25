const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { REQUEST_SERVICE_BILLING_STATUS } = require("../constants/invoiceEnums");

const getModels = () => sequelize.models;

const buildContractInclude = ({ scopedBuildingId, required = false, search } = {}) => {
  const { Contract, Room, Building } = getModels();
  const include = {
    model: Contract,
    as: "contract",
    attributes: ["id", "contract_number", "room_id"],
    required,
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number"],
        ...(scopedBuildingId ? { required: true } : {}),
        include: [
          {
            model: Building,
            as: "building",
            attributes: ["id", "name"],
            ...(scopedBuildingId ? { where: { id: scopedBuildingId }, required: true } : {}),
          },
        ],
      },
    ],
  };

  if (search) {
    include.where = { contract_number: { [Op.iLike]: `%${search}%` } };
    include.required = true;
  }

  return include;
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

const createSettlement = (values, options = {}) => {
  const { Settlement } = getModels();

  return Settlement.create(values, options);
};

const bulkCreateSettlementItems = (values, options = {}) => {
  const { SettlementItem } = getModels();

  return SettlementItem.bulkCreate(values, options);
};

const markRequestsSettled = (requestIds, options = {}) => {
  const { Request } = getModels();

  return Request.update(
    {
      service_billing_status: REQUEST_SERVICE_BILLING_STATUS.SETTLED,
      service_billed_at: new Date(),
    },
    { where: { id: { [Op.in]: requestIds } }, ...options },
  );
};

const findAndCountSettlements = ({ page = 1, limit = 10, where = {}, scopedBuildingId, search } = {}) => {
  const { Settlement, SettlementItem, User } = getModels();
  const contractInclude = buildContractInclude({
    scopedBuildingId,
    required: Boolean(scopedBuildingId),
    search,
  });

  return Settlement.findAndCountAll({
    where,
    include: [
      contractInclude,
      { model: User, as: "resident", attributes: ["id", "first_name", "last_name", "email"] },
      { model: User, as: "creator", attributes: ["id", "first_name", "last_name"] },
      { model: SettlementItem, as: "items", attributes: ["id"] },
    ],
    order: [["finalized_at", "DESC"]],
    limit: Number(limit),
    offset: (page - 1) * Number(limit),
    distinct: true,
    subQuery: false,
  });
};

const findSettlement = ({ where = {}, scopedBuildingId } = {}) => {
  const { Settlement, SettlementItem, User } = getModels();

  return Settlement.findOne({
    where,
    include: [
      { model: SettlementItem, as: "items" },
      buildContractInclude({ scopedBuildingId, required: Boolean(scopedBuildingId) }),
      { model: User, as: "resident", attributes: ["id", "email", "first_name", "last_name"] },
      { model: User, as: "creator", attributes: ["id", "email", "first_name", "last_name"] },
    ],
  });
};

const updateSettlement = (settlement, values, options = {}) => {
  return settlement.update(values, options);
};

const findInProgressCheckoutRequest = ({ roomId, residentId }, options = {}) => {
  const { Request } = getModels();

  return Request.findOne({
    where: {
      room_id: roomId,
      resident_id: residentId,
      request_type: "CHECKOUT",
      status: "IN_PROGRESS",
    },
    order: [["created_at", "DESC"]],
    ...options,
  });
};

const updateRequest = (request, values, options = {}) => {
  return request.update(values, options);
};

const createRequestStatusHistory = (values, options = {}) => {
  const { RequestStatusHistory } = getModels();

  return RequestStatusHistory.create(values, options);
};

module.exports = {
  findUnbilledServiceRequestsForRoom,
  createSettlement,
  bulkCreateSettlementItems,
  markRequestsSettled,
  findAndCountSettlements,
  findSettlement,
  updateSettlement,
  findInProgressCheckoutRequest,
  updateRequest,
  createRequestStatusHistory,
};
