const { sequelize } = require("../config/db");

const getModels = () => sequelize.models;

const findPendingBookingForDeposit = (bookingId, userId) => {
  const { Booking } = getModels();

  return Booking.findOne({
    where: { id: bookingId, customer_id: userId, status: "PENDING" },
  });
};

const findUnpaidInvoiceForUser = (invoiceId, userId) => {
  const { Invoice, Contract } = getModels();

  return Invoice.findOne({
    where: { id: invoiceId, status: "UNPAID" },
    include: [{ model: Contract, as: "contract", where: { customer_id: userId } }],
  });
};

const createPayment = (values, options = {}) => {
  const { Payment } = getModels();

  return Payment.create(values, options);
};

const updateBooking = (booking, values, options = {}) => {
  return booking.update(values, options);
};

const updatePayment = (payment, values, options = {}) => {
  return payment.update(values, options);
};

const updateInvoice = (invoice, values, options = {}) => {
  return invoice.update(values, options);
};

const updateContract = (contract, values, options = {}) => {
  return contract.update(values, options);
};

const updateUser = (user, values, options = {}) => {
  return user.update(values, options);
};

const findBookingByDepositPaymentId = (paymentId, options = {}) => {
  const { Booking, Room, Building } = getModels();

  return Booking.findOne({
    where: { deposit_payment_id: paymentId },
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

const findUserById = (userId, options = {}) => {
  const { User } = getModels();

  return User.findByPk(userId, options);
};

const findInvoiceById = (invoiceId, options = {}) => {
  const { Invoice } = getModels();

  return Invoice.findByPk(invoiceId, options);
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

const findContractById = (contractId, options = {}) => {
  const { Contract } = getModels();

  return Contract.findByPk(contractId, options);
};

const findPaymentByGatewayTransactionId = (gatewayTransactionId) => {
  const { Payment } = getModels();

  return Payment.findOne({
    where: { gateway_transaction_id: String(gatewayTransactionId) },
  });
};

const findPaymentsByUserId = (userId) => {
  const { Payment, Booking, Room, Building } = getModels();

  return Payment.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Booking,
        as: "booking",
        include: [
          {
            model: Room,
            as: "room",
            include: [{ model: Building, as: "building" }],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

module.exports = {
  findPendingBookingForDeposit,
  findUnpaidInvoiceForUser,
  createPayment,
  updateBooking,
  updatePayment,
  updateInvoice,
  updateContract,
  updateUser,
  findBookingByDepositPaymentId,
  findUserById,
  findInvoiceById,
  findContractWithRoomById,
  findContractById,
  findPaymentByGatewayTransactionId,
  findPaymentsByUserId,
};
