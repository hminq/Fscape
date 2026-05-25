const { sequelize } = require('../config/db');
const moment = require('moment');
const { generateNumberedId } = require('../utils/generateId');
const { billingCycleToMonths } = require('../utils/billingCycle.util');
const { parseUTCDate, todayUTC } = require('../utils/date.util');
const { createNotification } = require('./notification.service');
const { INVOICE_PAYMENT_DEADLINE_DAYS } = require('../constants/jobTimeRules');
const invoiceRepository = require('../repositories/invoice.repository');

const AppError = require('../utils/AppError');
// Rent invoice generation by billing cycle.

const generateRentInvoices = async () => {
    const today = moment().format('YYYY-MM-DD');

    const dueContracts = await invoiceRepository.findContractsDueForRentBilling(today);

    console.log(`[RentInvoiceJob] Found ${dueContracts.length} contract(s) due for rent billing.`);
    let generatedCount = 0;

    for (const contract of dueContracts) {
        const transaction = await sequelize.transaction();
        try {
            const billingPeriodStart = contract.next_billing_date;

            const monthsToAdd = billingCycleToMonths(contract.billing_cycle);
            if (monthsToAdd == null) {
                // ALL_IN contracts do not generate periodic rent invoices.
                await transaction.rollback();
                continue;
            }

            const billingPeriodEnd = moment(billingPeriodStart).add(monthsToAdd, 'months').subtract(1, 'days').format('YYYY-MM-DD');
            const nextBillingDate = moment(billingPeriodStart).add(monthsToAdd, 'months').format('YYYY-MM-DD');

            const roomRent = Number(contract.base_rent) * monthsToAdd;

            const dueDate = moment(billingPeriodStart).add(INVOICE_PAYMENT_DEADLINE_DAYS, 'days').format('YYYY-MM-DD');

            const newInvoice = await invoiceRepository.createInvoice({
                invoice_number: generateNumberedId('INV'),
                invoice_type: 'RENT',
                contract_id: contract.id,
                billing_period_start: billingPeriodStart,
                billing_period_end: billingPeriodEnd,
                room_rent: roomRent,
                request_fees: 0,
                penalty_fees: 0,
                total_amount: roomRent,
                status: 'UNPAID',
                due_date: dueDate
            }, { transaction });

            await invoiceRepository.createInvoiceItem({
                invoice_id: newInvoice.id,
                item_type: 'RENT',
                description: `Tiền thuê phòng từ ${billingPeriodStart} đến ${billingPeriodEnd}`,
                quantity: 1,
                unit_price: roomRent,
                amount: roomRent
            }, { transaction });

            await invoiceRepository.updateContract(contract, {
                next_billing_date: nextBillingDate,
                last_billed_date: billingPeriodStart
            }, { transaction });

            await transaction.commit();

            // Notification (outside transaction)
            try {
                await createNotification({
                    type: 'INVOICE',
                    title: 'Hóa đơn tiền phòng mới',
                    content: `Bạn có hóa đơn tiền phòng mới (${newInvoice.invoice_number}) kỳ ${billingPeriodStart} đến ${billingPeriodEnd}. Vui lòng thanh toán trước ${dueDate}.`,
                    target_type: 'INVOICE',
                    target_id: newInvoice.id,
                    specific_user_ids: [contract.customer_id]
                });
            } catch (notifyErr) {
                console.error(`[RentInvoiceJob] Notification failed for ${newInvoice.invoice_number}:`, notifyErr.message);
            }

            generatedCount++;
            console.log(`[RentInvoiceJob] ${newInvoice.invoice_number} cho ${contract.contract_number}`);
        } catch (err) {
            await transaction.rollback();
            console.error(`[RentInvoiceJob] Lỗi hợp đồng ${contract.id}:`, err.message);
        }
    }

    return generatedCount;
};

// Service invoice generation (every 30 days).

const generateServiceInvoices = async () => {
    const today = todayUTC();
    const todayDate = parseUTCDate(today);

    const dueContracts = await invoiceRepository.findContractsDueForServiceBilling(todayDate);

    console.log(`[ServiceInvoiceJob] Found ${dueContracts.length} contract(s) due for service billing.`);
    let generatedCount = 0;

    for (const contract of dueContracts) {
        const transaction = await sequelize.transaction();
        try {
            // Find unbilled completed requests
            const completedRequests = await invoiceRepository.findUnbilledCompletedRequests(
                contract.room_id,
                { transaction }
            );

            // Service billing is now day-based: once the billing date is reached,
            // the contract is due for the whole day.
            const currentBillingDate = contract.next_service_billing_at
                ? moment(contract.next_service_billing_at).utc().format('YYYY-MM-DD')
                : today;
            const nextServiceBillingAt = parseUTCDate(
                moment(currentBillingDate).add(30, 'days').format('YYYY-MM-DD')
            );
            await invoiceRepository.updateContract(contract, { next_service_billing_at: nextServiceBillingAt }, { transaction });

            // Skip invoice creation if no unbilled requests
            if (completedRequests.length === 0) {
                await transaction.commit();
                continue;
            }

            const requestFees = completedRequests.reduce(
                (sum, req) => sum + Number(req.request_price || 0), 0
            );

            const billingPeriodEnd = today;
            const billingPeriodStart = moment(today).subtract(30, 'days').format('YYYY-MM-DD');
            const dueDate = moment(today).add(INVOICE_PAYMENT_DEADLINE_DAYS, 'days').format('YYYY-MM-DD');

            const newInvoice = await invoiceRepository.createInvoice({
                invoice_number: generateNumberedId('INV-SVC'),
                invoice_type: 'SERVICE',
                contract_id: contract.id,
                billing_period_start: billingPeriodStart,
                billing_period_end: billingPeriodEnd,
                room_rent: 0,
                request_fees: requestFees,
                penalty_fees: 0,
                total_amount: requestFees,
                status: 'UNPAID',
                due_date: dueDate
            }, { transaction });

            for (const req of completedRequests) {
                await invoiceRepository.createInvoiceItem({
                    invoice_id: newInvoice.id,
                    reference_type: 'REQUEST',
                    reference_id: req.id,
                    item_type: 'REQUEST',
                    description: `Phí dịch vụ: ${req.title}`,
                    quantity: 1,
                    unit_price: Number(req.request_price),
                    amount: Number(req.request_price)
                }, { transaction });
            }

            // Mark requests as INVOICED
            const requestIds = completedRequests.map(r => r.id);
            await invoiceRepository.markRequestsInvoiced(requestIds, newInvoice.id, { transaction });

            await transaction.commit();

            // Notification (outside transaction)
            try {
                await createNotification({
                    type: 'INVOICE',
                    title: 'Hóa đơn phí dịch vụ mới',
                    content: `Bạn có hóa đơn phí dịch vụ mới (${newInvoice.invoice_number}), tổng ${requestFees.toLocaleString('vi-VN')}đ. Vui lòng thanh toán trước ${dueDate}.`,
                    target_type: 'INVOICE',
                    target_id: newInvoice.id,
                    specific_user_ids: [contract.customer_id]
                });
            } catch (notifyErr) {
                console.error(`[ServiceInvoiceJob] Notification failed for ${newInvoice.invoice_number}:`, notifyErr.message);
            }

            generatedCount++;
            console.log(`[ServiceInvoiceJob] ${newInvoice.invoice_number} cho ${contract.contract_number} (${completedRequests.length} requests)`);
        } catch (err) {
            await transaction.rollback();
            console.error(`[ServiceInvoiceJob] Lỗi hợp đồng ${contract.id}:`, err.message);
        }
    }

    return generatedCount;
};

// Combined generator used by cron job.

const generatePeriodicInvoices = async () => {
    const rentCount = await generateRentInvoices();
    const serviceCount = await generateServiceInvoices();
    return rentCount + serviceCount;
};

// Query helpers.

const { ROLES } = require('../constants/roles');

const getAllInvoices = async (caller, { page = 1, limit = 10, status, invoice_type, building_id, search } = {}) => {
    let scopedBuildingId;
    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (!caller.building_id) throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
        scopedBuildingId = caller.building_id;
    }

    const { count, rows } = await invoiceRepository.findAndCountInvoices(
        { page, limit, status, invoice_type, building_id, search },
        scopedBuildingId
    );

    return { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / limit), data: rows };
};

const getInvoiceStats = async (caller) => {
    let scopedBuildingId;
    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (!caller.building_id) throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
        scopedBuildingId = caller.building_id;
    }

    const rows = await invoiceRepository.findInvoicesForStats(scopedBuildingId);

    const byStatus = {};
    const byType = {};
    for (const r of rows) {
        const sk = r.status.toLowerCase();
        byStatus[sk] = (byStatus[sk] || 0) + 1;
        const tk = r.invoice_type.toLowerCase();
        byType[tk] = (byType[tk] || 0) + 1;
    }

    return { total: rows.length, by_status: byStatus, by_type: byType };
};

const getMyInvoices = async (userId, query = {}) => {
    const {
        page = 1,
        limit = 10,
    } = query;

    const { count, rows } = await invoiceRepository.findAndCountMyInvoices(userId, query);

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows,
    };
};

const getInvoiceById = async (caller, invoiceId) => {
    const invoice = await invoiceRepository.findInvoiceByIdForCaller(invoiceId, caller);

    if (!invoice) {
        throw new AppError('Không tìm thấy hóa đơn', 404);
    }

    if (caller.role === ROLES.BUILDING_MANAGER) {
        if (!caller.building_id) throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
        if (invoice.contract?.room?.building_id !== caller.building_id) {
            throw new AppError('Bạn không có quyền truy cập hóa đơn này.', 403);
        }
    }

    return invoice;
};


module.exports = {
    generatePeriodicInvoices,
    generateRentInvoices,
    generateServiceInvoices,
    getAllInvoices,
    getInvoiceStats,
    getMyInvoices,
    getInvoiceById
};
