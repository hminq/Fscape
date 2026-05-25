const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const settlementRepository = require('../repositories/settlement.repository');
const auditService = require('./audit.service');
const { SETTLEMENT_STATUS, SETTLEMENT_ITEM_TYPE, EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE } = require('../constants/settlementEnums');
const { billingCycleToMonths, isAllInBillingCycle } = require('../utils/billingCycle.util');
const { ROLES } = require('../constants/roles');

const AppError = require('../utils/AppError');
const getScopedSettlementQuery = (user, baseWhere = {}) => {
    if (user.role === ROLES.ADMIN) {
        return { where: baseWhere, scopedBuildingId: null };
    }

    if (user.role === ROLES.STAFF) {
        return {
            where: { ...baseWhere, created_by: user.id },
            scopedBuildingId: null
        };
    }

    if (!user.building_id) {
        throw new AppError('Tài khoản chưa được gán tòa nhà', 403);
    }

    return { where: baseWhere, scopedBuildingId: user.building_id };
};

/**
 * Create a settlement record during checkout.
 *
 * @param {Object} contract - Sequelize Contract instance
 * @param {Object} penaltyData - { missingAssets, brokenAssets, missingPenalty, brokenPenalty, totalPenalty }
 * @param {Object} user - Staff performing checkout
 * @param {Object} transaction - Sequelize transaction
 * @returns {Object} settlement with items
 */
const createCheckoutSettlement = async (contract, penaltyData, user, transaction) => {
    // Query unbilled service requests.
    const unbilledRequests = await settlementRepository.findUnbilledServiceRequestsForRoom(
        contract.room_id,
        { transaction }
    );

    const totalUnbilledService = unbilledRequests.reduce(
        (sum, req) => sum + Number(req.request_price || 0), 0
    );

    // Early checkout penalty: 50% of original deposit when checkout before end_date.
    // Exempt only when billing cycle covers the entire contract in a single payment:
    //   ALL_IN, or cycle months >= duration_months (e.g. CYCLE_6M + 6-month contract).
    const depositOriginal = Number(contract.deposit_original_amount || contract.deposit_amount);
    const today = new Date().toISOString().split('T')[0];
    const isBeforeEndDate = contract.end_date && today < contract.end_date;

    let earlyCheckoutPenalty = 0;
    if (isBeforeEndDate) {
        const cycleMonths = billingCycleToMonths(contract.billing_cycle);
        const paidFullUpfront = isAllInBillingCycle(contract.billing_cycle)
            || (cycleMonths != null && cycleMonths >= Number(contract.duration_months));

        if (!paidFullUpfront) {
            earlyCheckoutPenalty = Math.round(depositOriginal * EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE);
        }
    }

    // Calculate settlement amounts.
    const depositBefore = Number(contract.deposit_amount);
    const totalPenalty = penaltyData.totalPenalty;
    const totalDeductions = totalPenalty + totalUnbilledService + earlyCheckoutPenalty;

    const amountRefund = Math.max(0, depositBefore - totalDeductions);
    const amountDue = Math.max(0, totalDeductions - depositBefore);

    // Create settlement record.
    const settlement = await settlementRepository.createSettlement({
        contract_id: contract.id,
        resident_id: contract.customer_id,
        status: SETTLEMENT_STATUS.FINALIZED,
        deposit_original_amount: depositOriginal,
        deposit_balance_before: depositBefore,
        total_penalty_amount: totalPenalty + earlyCheckoutPenalty,
        total_unbilled_service_amount: totalUnbilledService,
        amount_due_from_resident: amountDue,
        amount_refund_to_resident: amountRefund,
        finalized_at: new Date(),
        created_by: user.id
    }, { transaction });

    // Create settlement items.
    const items = [];

    // Missing asset penalties
    for (const asset of penaltyData.missingAssets) {
        const price = Number(asset.asset_type?.default_price || asset.price || 0);
        if (price > 0) {
            items.push({
                settlement_id: settlement.id,
                item_type: SETTLEMENT_ITEM_TYPE.ASSET_PENALTY,
                reference_type: 'Asset',
                reference_id: asset.id,
                description: `Thiếu tài sản: ${asset.name || asset.asset_type?.name || ''} (${asset.qr_code})`,
                quantity: 1,
                unit_amount: price,
                amount: price,
                metadata: { reason: 'MISSING', qr_code: asset.qr_code }
            });
        }
    }

    // Broken asset penalties
    for (const asset of penaltyData.brokenAssets) {
        const price = Number(asset.asset_type?.default_price || asset.price || 0);
        if (price > 0) {
            items.push({
                settlement_id: settlement.id,
                item_type: SETTLEMENT_ITEM_TYPE.ASSET_PENALTY,
                reference_type: 'Asset',
                reference_id: asset.id,
                description: `Hư hỏng tài sản: ${asset.name || asset.asset_type?.name || ''} (${asset.qr_code})`,
                quantity: 1,
                unit_amount: price,
                amount: price,
                metadata: { reason: 'BROKEN', qr_code: asset.qr_code }
            });
        }
    }

    // Early checkout penalty
    if (earlyCheckoutPenalty > 0) {
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.EARLY_CHECKOUT,
            reference_type: 'Contract',
            reference_id: contract.id,
            description: `Phạt trả phòng trước hạn (${EARLY_CHECKOUT_DEPOSIT_PENALTY_RATE * 100}% tiền cọc)`,
            quantity: 1,
            unit_amount: earlyCheckoutPenalty,
            amount: earlyCheckoutPenalty,
            metadata: { end_date: contract.end_date, checkout_date: new Date().toISOString() }
        });
    }

    // Unbilled service requests
    for (const req of unbilledRequests) {
        const price = Number(req.request_price);
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.UNBILLED_SERVICE,
            reference_type: 'Request',
            reference_id: req.id,
            description: `Phí dịch vụ: ${req.title || req.request_type} (#${req.request_number || req.id})`,
            quantity: 1,
            unit_amount: price,
            amount: price,
            metadata: { request_type: req.request_type }
        });
    }

    // Deposit offset (negative amount showing deposit applied)
    const depositUsed = Math.min(depositBefore, totalDeductions);
    if (depositUsed > 0) {
        items.push({
            settlement_id: settlement.id,
            item_type: SETTLEMENT_ITEM_TYPE.DEPOSIT_OFFSET,
            reference_type: 'Contract',
            reference_id: contract.id,
            description: 'Khấu trừ tiền cọc',
            quantity: 1,
            unit_amount: -depositUsed,
            amount: -depositUsed,
            metadata: {}
        });
    }

    let createdItems = [];
    if (items.length > 0) {
        createdItems = await settlementRepository.bulkCreateSettlementItems(items, { transaction });
    }

    // Mark unbilled requests as SETTLED.
    if (unbilledRequests.length > 0) {
        const requestIds = unbilledRequests.map(r => r.id);
        await settlementRepository.markRequestsSettled(requestIds, { transaction });
    }

    const result = settlement.toJSON();
    result.items = createdItems.map(i => i.toJSON());
    return result;
};

/**
 * List all settlements with pagination, status filter, search, and BM scoping.
 */
const getAllSettlements = async ({ page = 1, limit = 10, status, search } = {}, user) => {
    const baseWhere = {};

    if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
        baseWhere.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
    }

    const { where, scopedBuildingId } = getScopedSettlementQuery(user, baseWhere);
    const { count, rows } = await settlementRepository.findAndCountSettlements({
        page,
        limit,
        where,
        scopedBuildingId,
        search
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows
    };
};

/**
 * Get settlement by ID.
 */
const getSettlement = async (settlementId, user) => {
    const { where, scopedBuildingId } = getScopedSettlementQuery(user, { id: settlementId });

    const settlement = await settlementRepository.findSettlement({
        where,
        scopedBuildingId
    });

    if (!settlement) {
        throw new AppError('Không tìm thấy quyết toán', 404);
    }

    return settlement;
};

/**
 * Get settlement by contract ID.
 */
const getSettlementByContract = async (contract_id, user) => {
    const { where, scopedBuildingId } = getScopedSettlementQuery(user, { contract_id });

    const settlement = await settlementRepository.findSettlement({
        where,
        scopedBuildingId
    });

    if (!settlement) {
        throw new AppError('Không tìm thấy quyết toán cho hợp đồng này', 404);
    }

    return settlement;
};

/**
 * Close a settlement after offline money exchange.
 */
const closeSettlement = async (settlementId, user) => {
    const settlement = await getSettlement(settlementId, user);

    if (!settlement) {
        throw new AppError('Không tìm thấy quyết toán', 404);
    }

    if (settlement.status !== SETTLEMENT_STATUS.FINALIZED) {
        throw new AppError('Chỉ có thể đóng quyết toán đang chờ xử lý', 400);
    }

    const transaction = await sequelize.transaction();

    try {
        await settlementRepository.updateSettlement(settlement, {
            status: SETTLEMENT_STATUS.CLOSED,
            closed_at: new Date()
        }, { transaction });

        const checkoutRequest = await settlementRepository.findInProgressCheckoutRequest(
            {
                roomId: settlement.contract?.room?.id || settlement.contract?.room_id,
                residentId: settlement.resident_id
            },
            { transaction }
        );

        if (checkoutRequest) {
            await settlementRepository.updateRequest(checkoutRequest, {
                status: 'DONE',
                completed_at: new Date(),
                completion_note: checkoutRequest.completion_note || 'Đã đóng quyết toán checkout'
            }, { transaction });

            await settlementRepository.createRequestStatusHistory({
                request_id: checkoutRequest.id,
                from_status: 'IN_PROGRESS',
                to_status: 'DONE',
                changed_by: user.id,
                reason: `Đóng quyết toán ${settlement.id}`
            }, { transaction });
        }

        await auditService.log({
            user,
            action: 'UPDATE',
            entityType: 'settlement',
            entityId: settlement.id,
            oldValue: { status: SETTLEMENT_STATUS.FINALIZED },
            newValue: {
                status: SETTLEMENT_STATUS.CLOSED,
                checkout_request_id: checkoutRequest?.id || null
            }
        }, { transaction });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }

    return settlement;
};

module.exports = { createCheckoutSettlement, getAllSettlements, getSettlement, getSettlementByContract, closeSettlement };
