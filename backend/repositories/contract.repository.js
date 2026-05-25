const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { ROLES } = require("../constants/roles");
const { INVOICE_TYPE } = require("../constants/invoiceEnums");

const getModels = () => sequelize.models;

const findAndCountContracts = ({ page = 1, limit = 10, status, building_id, search } = {}, scopedBuildingId) => {
  const { Contract, User, Room, Building } = getModels();
  const offset = (page - 1) * limit;
  const where = {};

  if (status) {
    const statuses = status.split(",").map((item) => item.trim()).filter(Boolean);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (search) {
    where[Op.or] = [{ contract_number: { [Op.iLike]: `%${search}%` } }];
  }

  const resolvedBuildingId = scopedBuildingId || building_id;

  return Contract.findAndCountAll({
    where,
    include: [
      { model: User, as: "customer", attributes: ["id", "first_name", "last_name", "email"] },
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor"],
        ...(resolvedBuildingId ? { required: true } : {}),
        include: [
          {
            model: Building,
            as: "building",
            ...(resolvedBuildingId ? { where: { id: resolvedBuildingId }, required: true } : {}),
          },
        ],
      },
    ],
    limit: Number(limit),
    offset: Number(offset),
    order: [["createdAt", "DESC"]],
  });
};

const findContractDetailById = (contractId, options = {}) => {
  const { Contract, ContractTemplate, User, Room, Building } = getModels();

  return Contract.findByPk(contractId, {
    include: [
      { model: User, as: "customer" },
      { model: User, as: "manager" },
      {
        model: Room,
        as: "room",
        include: [{ model: Building, as: "building" }],
      },
      { model: ContractTemplate, as: "template" },
    ],
    ...options,
  });
};

const findContractWithRoomById = (contractId, options = {}) => {
  const { Contract, Room, Building } = getModels();

  return Contract.findByPk(contractId, {
    include: [
      {
        model: Room,
        as: "room",
        include: [{ model: Building, as: "building" }],
      },
    ],
    ...options,
  });
};

const findAndCountMyContracts = (userId, query = {}) => {
  const { Contract, Room, Building, RoomType } = getModels();
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

  if (status === "action_needed") {
    where.status = {
      [Op.in]: [
        "DRAFT",
        "PENDING_CUSTOMER_SIGNATURE",
        "PENDING_MANAGER_SIGNATURE",
        "PENDING_FIRST_PAYMENT",
      ],
    };
  } else if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.contract_number = { [Op.iLike]: `%${search}%` };
  }

  const sortColumnMap = {
    created_at: "createdAt",
    start_date: "start_date",
    end_date: "end_date",
    base_rent: "base_rent",
    status: "status",
  };
  const sortCol = sortColumnMap[sort_by] || "createdAt";
  const sortDir = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  return Contract.findAndCountAll({
    where,
    attributes: [
      "id",
      "contract_number",
      "status",
      "start_date",
      "end_date",
      "base_rent",
      "deposit_amount",
      "pdf_url",
      "rendered_content",
      "customer_signed_at",
      "manager_signed_at",
      "signature_expires_at",
      "createdAt",
    ],
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "floor", "thumbnail_url"],
        include: [
          { model: Building, as: "building", attributes: ["id", "name", "address"] },
          { model: RoomType, as: "room_type", attributes: ["id", "name"] },
        ],
      },
    ],
    distinct: true,
    limit: Number(limit),
    offset: Number(offset),
    order: [[sortCol, sortDir]],
  });
};

const findDepositPaidBookingWithRoom = (bookingId, options = {}) => {
  const { Booking, Room, RoomType, Building } = getModels();

  return Booking.findByPk(bookingId, {
    include: [
      {
        model: Room,
        as: "room",
        include: [
          { model: RoomType, as: "room_type" },
          { model: Building, as: "building" },
        ],
      },
    ],
    ...options,
  });
};

const findUserWithProfileById = (userId, options = {}) => {
  const { User, CustomerProfile } = getModels();

  return User.findByPk(userId, {
    include: [{ model: CustomerProfile, as: "profile" }],
    ...options,
  });
};

const findActiveBuildingManager = (buildingId, options = {}) => {
  const { User } = getModels();

  return User.findOne({
    where: { building_id: buildingId, role: ROLES.BUILDING_MANAGER, is_active: true },
    ...options,
  });
};

const findDefaultTemplate = (options = {}) => {
  const { ContractTemplate } = getModels();

  return ContractTemplate.findOne({
    where: { is_default: true, is_active: true },
    ...options,
  });
};

const countContracts = (options = {}) => {
  const { Contract } = getModels();

  return Contract.count(options);
};

const createContract = (values, options = {}) => {
  const { Contract } = getModels();

  return Contract.create(values, options);
};

const updateBooking = (booking, values, options = {}) => {
  return booking.update(values, options);
};

const updateContract = (contract, values, options = {}) => {
  return contract.update(values, options);
};

const updateUser = (user, values, options = {}) => {
  return user.update(values, options);
};

const findRenewableContractById = (contractId, options = {}) => {
  const { Contract, Room, RoomType, Building } = getModels();

  return Contract.findByPk(contractId, {
    include: [
      {
        model: Room,
        as: "room",
        include: [
          { model: RoomType, as: "room_type" },
          { model: Building, as: "building" },
        ],
      },
    ],
    ...options,
  });
};

const findPendingRenewal = (contractId, options = {}) => {
  const { Contract } = getModels();

  return Contract.findOne({
    where: {
      renewed_from_contract_id: contractId,
      status: { [Op.in]: ["PENDING_CUSTOMER_SIGNATURE", "PENDING_MANAGER_SIGNATURE"] },
    },
    ...options,
  });
};

const createContractExtension = (values, options = {}) => {
  const { ContractExtension } = getModels();

  return ContractExtension.create(values, options);
};

const findContractForCustomerSign = (contractId) => {
  return findContractWithRoomById(contractId);
};

const findUserById = (userId, options = {}) => {
  const { User } = getModels();

  return User.findByPk(userId, options);
};

const findContractForManagerSign = (contractId, options = {}) => {
  return findContractWithRoomById(contractId, options);
};

const findBookingByContractId = (contractId, options = {}) => {
  const { Booking } = getModels();

  return Booking.findOne({
    where: { contract_id: contractId },
    ...options,
  });
};

const createInvoice = (values, options = {}) => {
  const { Invoice } = getModels();

  return Invoice.create(values, options);
};

const createInvoiceItem = (values, options = {}) => {
  const { InvoiceItem } = getModels();

  return InvoiceItem.create(values, options);
};

const updateContractPdfUrl = (contractId, pdfUrl) => {
  const { Contract } = getModels();

  return Contract.update({ pdf_url: pdfUrl }, { where: { id: contractId } });
};

const findContractsForStats = (buildingId) => {
  const { Contract, Room, Building } = getModels();
  const include = [
    {
      model: Room,
      as: "room",
      attributes: ["id"],
      include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
    },
  ];

  if (buildingId) {
    include[0].include[0].where = { id: buildingId };
    include[0].include[0].required = true;
    include[0].required = true;
  }

  return Contract.findAll({
    attributes: ["status", "room_id"],
    include,
    raw: true,
    nest: true,
  });
};

const findContractForReminder = (contractId) => {
  const { Contract, User, Room, Building } = getModels();

  return Contract.findByPk(contractId, {
    include: [
      { model: User, as: "customer", attributes: ["id", "first_name", "last_name", "email"] },
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number"],
        include: [{ model: Building, as: "building" }],
      },
    ],
  });
};

const findFirstUnpaidRentInvoice = (contractId) => {
  const { Invoice } = getModels();

  return Invoice.findOne({
    where: { contract_id: contractId, invoice_type: INVOICE_TYPE.RENT, status: "UNPAID" },
    order: [["createdAt", "ASC"]],
  });
};

const findContractForTermination = (contractId) => {
  const { Contract, User, Room, Building } = getModels();

  return Contract.findByPk(contractId, {
    include: [
      { model: User, as: "customer", attributes: ["id", "email", "first_name", "last_name", "role"] },
      {
        model: Room,
        as: "room",
        attributes: ["id", "room_number", "status"],
        include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
      },
    ],
  });
};

const updateRoomStatus = (roomId, status, options = {}) => {
  const { Room } = getModels();

  return Room.update({ status }, { where: { id: roomId }, ...options });
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

const updateUserById = (userId, values, options = {}) => {
  const { User } = getModels();

  return User.update(values, { where: { id: userId }, ...options });
};

const createRequest = (values, options = {}) => {
  const { Request } = getModels();

  return Request.create(values, options);
};

const createRequestStatusHistory = (values, options = {}) => {
  const { RequestStatusHistory } = getModels();

  return RequestStatusHistory.create(values, options);
};

module.exports = {
  findAndCountContracts,
  findContractDetailById,
  findContractWithRoomById,
  findAndCountMyContracts,
  findDepositPaidBookingWithRoom,
  findUserWithProfileById,
  findActiveBuildingManager,
  findDefaultTemplate,
  countContracts,
  createContract,
  updateBooking,
  updateContract,
  updateUser,
  findRenewableContractById,
  findPendingRenewal,
  createContractExtension,
  findContractForCustomerSign,
  findUserById,
  findContractForManagerSign,
  findBookingByContractId,
  createInvoice,
  createInvoiceItem,
  updateContractPdfUrl,
  findContractsForStats,
  findContractForReminder,
  findFirstUnpaidRentInvoice,
  findContractForTermination,
  updateRoomStatus,
  countOtherActiveContracts,
  updateUserById,
  createRequest,
  createRequestStatusHistory,
};
