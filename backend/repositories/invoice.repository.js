const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const findContractsDueForRentBilling = (today) => {
  const { Contract, Room } = getModels();

  return Contract.findAll({
    where: {
      status: { [Op.in]: ["ACTIVE", "EXPIRING_SOON"] },
      next_billing_date: { [Op.lte]: today },
    },
    include: [{ model: Room, as: "room" }],
  });
};

const findContractsDueForServiceBilling = (todayDate) => {
  const { Contract, Room } = getModels();

  return Contract.findAll({
    where: {
      status: { [Op.in]: ["ACTIVE", "EXPIRING_SOON"] },
      next_service_billing_at: { [Op.lte]: todayDate },
    },
    include: [{ model: Room, as: "room" }],
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

const updateContract = (contract, values, options = {}) => {
  return contract.update(values, options);
};

const findUnbilledCompletedRequests = (roomId, options = {}) => {
  const { Request } = getModels();

  return Request.findAll({
    where: {
      room_id: roomId,
      status: { [Op.in]: ["COMPLETED", "DONE"] },
      service_billing_status: "UNBILLED",
      request_price: { [Op.gt]: 0 },
    },
    ...options,
  });
};

const markRequestsInvoiced = (requestIds, invoiceId, options = {}) => {
  const { Request } = getModels();

  return Request.update(
    {
      service_billing_status: "INVOICED",
      service_billed_at: new Date(),
      service_billed_invoice_id: invoiceId,
    },
    { where: { id: { [Op.in]: requestIds } }, ...options },
  );
};

const findAndCountInvoices = ({ page = 1, limit = 10, status, invoice_type, building_id, search } = {}, scopedBuildingId) => {
  const { Invoice, Contract, Room, Building, User } = getModels();
  const where = {};
  const contractWhere = {};
  const roomInclude = {
    model: Room,
    as: "room",
    attributes: ["id", "room_number", "floor", "building_id"],
    include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
  };

  if (status) {
    const statuses = status.split(",").map((item) => item.trim()).filter(Boolean);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (invoice_type) where.invoice_type = invoice_type;
  if (search) where.invoice_number = { [Op.iLike]: `%${search}%` };

  const resolvedBuildingId = scopedBuildingId || building_id;
  if (resolvedBuildingId) {
    roomInclude.where = { building_id: resolvedBuildingId };
    roomInclude.required = true;
  }

  return Invoice.findAndCountAll({
    where,
    include: [
      {
        model: Contract,
        as: "contract",
        attributes: ["id", "contract_number", "customer_id"],
        where: Object.keys(contractWhere).length ? contractWhere : undefined,
        include: [
          { model: User, as: "customer", attributes: ["id", "first_name", "last_name", "email"] },
          roomInclude,
        ],
      },
    ],
    limit: Number(limit),
    offset: (page - 1) * Number(limit),
    order: [["created_at", "DESC"]],
  });
};

const findInvoicesForStats = (scopedBuildingId) => {
  const { Invoice, Contract, Room } = getModels();
  const include = [];

  if (scopedBuildingId) {
    include.push({
      model: Contract,
      as: "contract",
      attributes: [],
      include: [
        {
          model: Room,
          as: "room",
          attributes: [],
          where: { building_id: scopedBuildingId },
          required: true,
        },
      ],
      required: true,
    });
  }

  return Invoice.findAll({
    attributes: ["status", "invoice_type"],
    include,
    raw: true,
  });
};

const findAndCountMyInvoices = (userId, query = {}) => {
  const { Invoice, Contract, Room, Building } = getModels();
  const {
    page = 1,
    limit = 10,
    sort_by = "created_at",
    sort_order = "DESC",
    status,
    invoice_type,
    search,
  } = query;
  const offset = (page - 1) * limit;
  const where = {};

  if (status === "unpaid") {
    where.status = { [Op.in]: ["UNPAID", "OVERDUE"] };
  } else if (status && status !== "all") {
    where.status = status;
  }

  if (invoice_type && invoice_type !== "all") {
    where.invoice_type = invoice_type;
  }

  if (search) {
    where.invoice_number = { [Op.iLike]: `%${search}%` };
  }

  const allowedSorts = ["created_at", "due_date", "total_amount", "status"];
  const sortCol = allowedSorts.includes(sort_by) ? sort_by : "created_at";
  const sortDir = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  return Invoice.findAndCountAll({
    where,
    include: [
      {
        model: Contract,
        as: "contract",
        where: { customer_id: userId },
        include: [
          {
            model: Room,
            as: "room",
            include: [{ model: Building, as: "building" }],
          },
        ],
      },
    ],
    distinct: true,
    limit: Number(limit),
    offset: Number(offset),
    order: [[sortCol, sortDir]],
  });
};

const findInvoiceByIdForCaller = (invoiceId, caller) => {
  const { Invoice, Contract, InvoiceItem, Room, Building, User } = getModels();
  const contractInclude = {
    model: Contract,
    as: "contract",
    include: [
      { model: User, as: "customer", attributes: ["id", "first_name", "last_name", "email", "phone", "avatar_url"] },
      {
        model: Room,
        as: "room",
        include: [{ model: Building, as: "building", attributes: ["id", "name"] }],
      },
    ],
  };

  if (caller.role === "RESIDENT" || caller.role === "CUSTOMER") {
    contractInclude.where = { customer_id: caller.id };
  }

  return Invoice.findOne({
    where: { id: invoiceId },
    include: [contractInclude, { model: InvoiceItem, as: "items" }],
  });
};

module.exports = {
  findContractsDueForRentBilling,
  findContractsDueForServiceBilling,
  createInvoice,
  createInvoiceItem,
  updateContract,
  findUnbilledCompletedRequests,
  markRequestsInvoiced,
  findAndCountInvoices,
  findInvoicesForStats,
  findAndCountMyInvoices,
  findInvoiceByIdForCaller,
};
