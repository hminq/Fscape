const { sequelize } = require('../config/db');
const inspectionRepository = require('../repositories/inspection.repository');
const auditService = require('./audit.service');
const settlementService = require('./settlement.service');

const AppError = require('../utils/AppError');
const { ROLES } = require('../constants/roles');

// Helpers.

function ensureBuildingAccess(user, room) {
    if (
        (user.role === ROLES.BUILDING_MANAGER || user.role === ROLES.STAFF) &&
        user.building_id !== room.building_id
    ) {
        throw new AppError('Bạn chỉ có thể kiểm tra phòng trong tòa nhà được phân công', 403);
    }
}

async function ensureCheckoutRequest(roomId, staffId) {
    const checkoutRequest = await inspectionRepository.findCheckoutRequest(roomId, staffId);
    if (!checkoutRequest) {
        throw new AppError('Không thể thực hiện trả phòng vì chưa có yêu cầu trả phòng đang xử lý được giao cho bạn', 403);
    }
    return checkoutRequest;
}

function resolveScannedAssets(qrCodes) {
    return inspectionRepository.findAssetsByQrCodes(qrCodes);
}

function findUnknownQrCodes(qrCodes, scannedAssets) {
    const found = new Set(scannedAssets.map(a => a.qr_code));
    return qrCodes.filter(qr => !found.has(qr));
}

function startOfDayUtc(dateString) {
    return new Date(`${dateString}T00:00:00.000Z`);
}

function toTimestamp(value) {
    return new Date(value).getTime();
}

function pickClosestInspection(inspections, targetTime) {
    if (!inspections.length) return null;

    return inspections.reduce((best, current) => {
        if (!best) return current;

        const bestDistance = Math.abs(toTimestamp(best.created_at) - targetTime);
        const currentDistance = Math.abs(toTimestamp(current.created_at) - targetTime);

        if (currentDistance < bestDistance) return current;
        if (currentDistance > bestDistance) return best;

        return toTimestamp(current.created_at) > toTimestamp(best.created_at) ? current : best;
    }, null);
}

async function resolveContractInspectionContext(roomId, contractId, caller) {
    const contract = await inspectionRepository.findContractWithRoomById(contractId);

    if (!contract) {
        throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    if (contract.room_id !== roomId) {
        throw new AppError('Dữ liệu không hợp lệ', 400);
    }

    if (caller.role === ROLES.BUILDING_MANAGER || caller.role === ROLES.STAFF) {
        ensureBuildingAccess(caller, contract.room);
    } else if (caller.role === ROLES.RESIDENT && contract.customer_id !== caller.id) {
        throw new AppError('Bạn không có quyền xem kiểm tra của hợp đồng này', 403);
    }

    return contract;
}

function selectContractInspections(inspections, contract) {
    const checkIns = inspections.filter((inspection) => inspection.type === 'CHECK_IN');
    const checkOuts = inspections.filter((inspection) => inspection.type === 'CHECK_OUT');

    const startTarget = toTimestamp(startOfDayUtc(contract.start_date));
    const selectedCheckIn = pickClosestInspection(checkIns, startTarget);

    let selectedCheckOut = null;
    const checkInTime = selectedCheckIn ? toTimestamp(selectedCheckIn.created_at) : null;
    const checkOutCandidates = checkInTime == null
        ? checkOuts
        : checkOuts.filter((inspection) => toTimestamp(inspection.created_at) >= checkInTime);

    if (checkOutCandidates.length > 0) {
        const checkoutTarget = contract.end_date
            ? toTimestamp(startOfDayUtc(contract.end_date))
            : (checkInTime || Date.now());
        selectedCheckOut = pickClosestInspection(checkOutCandidates, checkoutTarget);
    } else if (checkOuts.length > 0) {
        const fallbackTarget = contract.end_date
            ? toTimestamp(startOfDayUtc(contract.end_date))
            : startTarget;
        selectedCheckOut = pickClosestInspection(checkOuts, fallbackTarget);
    }

    return [selectedCheckIn, selectedCheckOut]
        .filter(Boolean)
        .sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at));
}

// CHECK-IN diff (type-based against room template).
async function computeCheckInDiff(room, qrCodes) {
    const template = await inspectionRepository.findRoomTypeAssetTemplate(room.room_type_id);

    const scannedAssets = await resolveScannedAssets(qrCodes);
    const unknownQrCodes = findUnknownQrCodes(qrCodes, scannedAssets);

    // Validate: scanned assets must not already be in another room
    const conflicts = scannedAssets.filter(a => a.current_room_id && a.current_room_id !== room.id);
    if (conflicts.length > 0) {
        const qrs = conflicts.map(a => a.qr_code).join(', ');
        throw new AppError(`Tài sản đã được gán cho phòng khác: ${qrs}`, 409);
    }

    // Group scanned by asset_type_id
    const scannedByType = {};
    for (const asset of scannedAssets) {
        if (!asset.asset_type_id) continue;
        if (!scannedByType[asset.asset_type_id]) scannedByType[asset.asset_type_id] = [];
        scannedByType[asset.asset_type_id].push(asset);
    }

    // Compare against template
    const results = [];
    const assetsToAssign = []; // assets that match template, will be assigned to room

    for (const item of template) {
        const typeId = item.asset_type_id;
        const expected = item.quantity;
        const scanned = scannedByType[typeId] || [];
        const actual = scanned.length;

        const entry = {
            asset_type_id: typeId,
            asset_type_name: item.asset_type.name,
            expected,
            actual,
            status: actual >= expected ? 'OK' : 'SHORT',
        };

        if (actual < expected) {
            entry.shortage = expected - actual;
        }

        // Take up to `expected` assets of this type for assignment
        const toAssign = scanned.slice(0, expected);
        assetsToAssign.push(...toAssign);

        results.push(entry);
    }

    // Extra: scanned assets whose type is not in the template
    const assignedIds = new Set(assetsToAssign.map(a => a.id));
    const extra = scannedAssets
        .filter(a => !assignedIds.has(a.id))
        .map(a => ({
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
        }));

    return { results, assetsToAssign, extra, unknown_qr_codes: unknownQrCodes, scannedAssets };
}

// CHECK-OUT diff (exact match against room assets).
async function computeCheckOutDiff(room, qrCodes) {
    // Assets currently linked to this room
    const expectedAssets = await inspectionRepository.findAssetsInRoom(room.id);

    const scannedAssets = await resolveScannedAssets(qrCodes);
    const unknownQrCodes = findUnknownQrCodes(qrCodes, scannedAssets);

    const scannedIds = new Set(scannedAssets.map(a => a.id));
    const expectedIds = new Set(expectedAssets.map(a => a.id));

    // Matched: in room AND scanned
    const matched = expectedAssets.filter(a => scannedIds.has(a.id));

    // Missing: in room but NOT scanned
    const missing = expectedAssets.filter(a => !scannedIds.has(a.id));

    // Extra: scanned but NOT in room
    const extra = scannedAssets
        .filter(a => !expectedIds.has(a.id))
        .map(a => ({
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
            current_room_id: a.current_room_id,
        }));

    // Penalty = sum of default_price for missing assets
    let penaltyTotal = 0;
    const missingDetails = missing.map(a => {
        const price = Number(a.asset_type?.default_price || a.price || 0);
        penaltyTotal += price;
        return {
            id: a.id,
            qr_code: a.qr_code,
            name: a.name,
            asset_type: a.asset_type ? a.asset_type.name : null,
            penalty: price,
        };
    });

    const matchedDetails = matched.map(a => ({
        id: a.id,
        qr_code: a.qr_code,
        name: a.name,
        asset_type: a.asset_type ? a.asset_type.name : null,
    }));

    return {
        matched: matchedDetails,
        missing: missingDetails,
        extra,
        penalty_total: penaltyTotal,
        unknown_qr_codes: unknownQrCodes,
        // Raw arrays for DB operations
        _matchedAssets: matched,
        _missingAssets: missing,
        _scannedAssets: scannedAssets,
    };
}

// Shared helper: build condition map from input assets.
function buildConditionMap(assetsInput) {
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }
    return conditionMap;
}

// POST /api/inspections/preview (STAFF, CHECK_OUT only)
const previewInspection = async (roomId, assetsInput, user) => {
    const room = await inspectionRepository.findRoomById(roomId);
    if (!room) throw new AppError('Không tìm thấy phòng', 404);
    ensureBuildingAccess(user, room);
    await ensureCheckoutRequest(roomId, user.id);

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = buildConditionMap(assetsInput);
    const diff = await computeCheckOutDiff(room, qrCodes);

    // Split matched into GOOD and BROKEN based on reported condition
    let brokenPenalty = 0;
    const conditionSummary = diff._scannedAssets
        .filter(a => diff._matchedAssets.some(m => m.id === a.id))
        .map(asset => {
            const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
            const note = conditionMap[asset.qr_code]?.note || null;
            const price = Number(asset.asset_type?.default_price || asset.price || 0);
            if (cond === 'BROKEN') brokenPenalty += price;
            return {
                qr_code: asset.qr_code,
                asset_id: asset.id,
                asset_type_name: asset.asset_type ? asset.asset_type.name : null,
                condition: cond,
                note,
                penalty: cond === 'BROKEN' ? price : 0
            };
        });

    const totalPenalty = diff.penalty_total + brokenPenalty;

    // Settlement preview (contract, unbilled services, and deposit).
    let settlementPreview = null;

    const contract = await inspectionRepository.findLatestContractForRoom(room.id);

    if (contract) {
        const depositOriginal = Number(contract.deposit_original_amount || contract.deposit_amount);
        const depositBefore = Number(contract.deposit_amount);

        // Query unbilled service requests
        const unbilledRequests = await inspectionRepository.findUnbilledServiceRequestsForRoom(room.id);

        const totalUnbilledService = unbilledRequests.reduce(
            (sum, req) => sum + Number(req.request_price || 0), 0
        );

        const totalDeductions = totalPenalty + totalUnbilledService;
        const amountRefund = Math.max(0, depositBefore - totalDeductions);
        const amountDue = Math.max(0, totalDeductions - depositBefore);

        settlementPreview = {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            deposit_original_amount: depositOriginal,
            deposit_balance_before: depositBefore,
            total_penalty_amount: totalPenalty,
            total_unbilled_service_amount: totalUnbilledService,
            amount_refund_to_resident: amountRefund,
            amount_due_from_resident: amountDue,
            unbilled_requests: unbilledRequests.map(r => ({
                id: r.id,
                request_number: r.request_number,
                request_type: r.request_type,
                title: r.title,
                price: Number(r.request_price)
            }))
        };
    }

    return {
        type: 'CHECK_OUT',
        matched: diff.matched,
        missing: diff.missing,
        condition_summary: conditionSummary,
        extra: diff.extra,
        penalty_total: totalPenalty,
        missing_penalty: diff.penalty_total,
        broken_penalty: brokenPenalty,
        settlement_preview: settlementPreview,
        unknown_qr_codes: diff.unknown_qr_codes
    };
};

// POST /api/inspections (STAFF, CHECK_OUT only)
const confirmInspection = async (roomId, assetsInput, notes, user) => {
    const room = await inspectionRepository.findRoomById(roomId);
    if (!room) throw new AppError('Không tìm thấy phòng', 404);
    ensureBuildingAccess(user, room);
    await ensureCheckoutRequest(roomId, user.id);

    return confirmCheckOut(room, assetsInput, notes, user);
};

// CHECK-OUT: unassign assets, mark broken/missing, and settle deposit.
async function confirmCheckOut(room, assetsInput, notes, user) {
    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = buildConditionMap(assetsInput);
    const diff = await computeCheckOutDiff(room, qrCodes);

    // Split matched assets by condition
    const matchedGood = [];
    const matchedBroken = [];
    let brokenPenalty = 0;

    for (const asset of diff._matchedAssets) {
        const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
        if (cond === 'BROKEN') {
            const price = Number(asset.asset_type?.default_price || asset.price || 0);
            brokenPenalty += price;
            matchedBroken.push(asset);
        } else {
            matchedGood.push(asset);
        }
    }

    const totalPenalty = diff.penalty_total + brokenPenalty;
    const hasDiscrepancy = diff.missing.length > 0 || matchedBroken.length > 0;

    const transaction = await sequelize.transaction();
    try {
        const inspection = await inspectionRepository.createInspection({
            room_id: room.id,
            performed_by: user.id,
            type: 'CHECK_OUT',
            status: hasDiscrepancy ? 'SETTLED' : 'NO_DISCREPANCY',
            penalty_total: totalPenalty,
            notes
        }, { transaction });

        // Create AssetInspectionItem records for scanned assets.
        const itemRows = diff._scannedAssets.map(asset => ({
            inspection_id: inspection.id,
            asset_id: asset.id,
            qr_code: asset.qr_code,
            condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
            note: conditionMap[asset.qr_code]?.note || null
        }));
        const items = await inspectionRepository.bulkCreateInspectionItems(itemRows, { transaction });

        // Build asset history records.
        const historyRows = [];

        for (const asset of matchedGood) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'AVAILABLE',
                action: 'CHECK_OUT',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        for (const asset of matchedBroken) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'MAINTENANCE',
                action: 'INSPECTION_BROKEN',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        for (const asset of diff._missingAssets) {
            historyRows.push({
                asset_id: asset.id,
                from_room_id: room.id,
                to_room_id: null,
                from_status: asset.status,
                to_status: 'MAINTENANCE',
                action: 'INSPECTION_MISSING',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            });
        }

        if (historyRows.length > 0) {
            await inspectionRepository.bulkCreateAssetHistory(historyRows, { transaction });
        }

        // Update asset statuses.
        const goodIds = matchedGood.map(a => a.id);
        if (goodIds.length > 0) {
            await inspectionRepository.updateAssetsByIds(goodIds, { current_room_id: null, status: 'AVAILABLE' }, { transaction });
        }

        const brokenIds = matchedBroken.map(a => a.id);
        const missingIds = diff._missingAssets.map(a => a.id);
        const maintenanceIds = [...brokenIds, ...missingIds];
        if (maintenanceIds.length > 0) {
            await inspectionRepository.updateAssetsByIds(maintenanceIds, { current_room_id: null, status: 'MAINTENANCE' }, { transaction });
        }

        // Load contract for settlement and status updates.
        const contract = await inspectionRepository.findLatestContractForRoom(room.id, { transaction });

        let depositInfo = null;
        let settlement = null;

        if (contract) {
            const originalDeposit = Number(contract.deposit_amount);
            const penalty = hasDiscrepancy ? totalPenalty : 0;
            const finalDeposit = originalDeposit - penalty;

            // Create settlement record.
            settlement = await settlementService.createCheckoutSettlement(
                contract,
                {
                    missingAssets: diff._missingAssets,
                    brokenAssets: matchedBroken,
                    missingPenalty: diff.penalty_total,
                    brokenPenalty,
                    totalPenalty: penalty
                },
                user,
                transaction
            );

            // Deduct deposit (keep for backward compatibility)
            if (hasDiscrepancy) {
                await inspectionRepository.updateContract(contract, { deposit_amount: finalDeposit }, { transaction });

                await auditService.log({
                    user,
                    action: 'UPDATE',
                    entityType: 'contract',
                    entityId: contract.id,
                    oldValue: { deposit_amount: originalDeposit },
                    newValue: { deposit_amount: finalDeposit, penalty_from_inspection: inspection.id, settlement_id: settlement.id },
                }, { transaction });
            }

            // Contract → FINISHED
            await inspectionRepository.updateContract(contract, { status: 'FINISHED' }, { transaction });

            // RESIDENT → CUSTOMER if no other active contracts
            const otherActive = await inspectionRepository.countOtherActiveContracts(
                contract.customer_id,
                contract.id,
                { transaction }
            );
            if (otherActive === 0) {
                await inspectionRepository.updateResidentToCustomer(contract.customer_id, { transaction });
            }

            depositInfo = {
                contract_id: contract.id,
                contract_number: contract.contract_number,
                original_deposit: originalDeposit,
                penalty_deducted: penalty,
                final_deposit: finalDeposit,
                deficit: finalDeposit < 0,
                settlement_id: settlement.id,
            };
        }

        // Room → AVAILABLE
        await inspectionRepository.updateRoomStatus(room.id, 'AVAILABLE', { transaction });

        await transaction.commit();

        // Build condition summary for response
        const conditionSummary = diff._scannedAssets
            .filter(a => diff._matchedAssets.some(m => m.id === a.id))
            .map(asset => {
                const cond = conditionMap[asset.qr_code]?.condition || 'GOOD';
                const price = Number(asset.asset_type?.default_price || asset.price || 0);
                return {
                    qr_code: asset.qr_code,
                    asset_id: asset.id,
                    asset_type_name: asset.asset_type ? asset.asset_type.name : null,
                    condition: cond,
                    note: conditionMap[asset.qr_code]?.note || null,
                    penalty: cond === 'BROKEN' ? price : 0
                };
            });

        return {
            inspection: inspection.toJSON(),
            items: items.map(i => i.toJSON()),
            matched: diff.matched,
            missing: diff.missing,
            condition_summary: conditionSummary,
            extra: diff.extra,
            penalty_total: totalPenalty,
            missing_penalty: diff.penalty_total,
            broken_penalty: brokenPenalty,
            deposit_info: depositInfo,
            settlement,
            unknown_qr_codes: diff.unknown_qr_codes
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

// RESIDENT self-service check-in.

async function resolveResidentContract(user, contractId, { forCheckIn = false } = {}) {
    const statuses = forCheckIn
        ? ['PENDING_CHECK_IN']
        : ['ACTIVE', 'EXPIRING_SOON'];

    const contract = await inspectionRepository.findResidentContract(user.id, contractId, statuses);

    if (!contract || !contract.room) {
        const message = forCheckIn
            ? 'Không tìm thấy hợp đồng ở trạng thái chờ nhận phòng'
            : 'Không tìm thấy hợp đồng đang hoạt động';
        throw new AppError(message, 403, 'CONTRACT_NOT_AVAILABLE');
    }

    return { contract, room: contract.room };
}

const residentPreviewCheckIn = async (contractId, assetsInput, user) => {
    const { contract, room } = await resolveResidentContract(user, contractId, { forCheckIn: true });

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }

    const { results, extra, unknown_qr_codes, scannedAssets } = await computeCheckInDiff(room, qrCodes);

    // Build condition summary from scanned assets
    const conditionSummary = scannedAssets.map(asset => ({
        qr_code: asset.qr_code,
        asset_id: asset.id,
        asset_type_name: asset.asset_type ? asset.asset_type.name : null,
        condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
        note: conditionMap[asset.qr_code]?.note || null
    }));

    // Check failures
    const failureReasons = [];

    const shortItems = results.filter(r => r.status === 'SHORT');
    for (const item of shortItems) {
        failureReasons.push(`${item.asset_type_name}: cần ${item.expected}, scan ${item.actual}`);
    }

    const brokenItems = conditionSummary.filter(c => c.condition === 'BROKEN');
    for (const item of brokenItems) {
        failureReasons.push(`${item.asset_type_name} (${item.qr_code}): tình trạng BROKEN${item.note ? ' - ' + item.note : ''}`);
    }

    const canCheckIn = shortItems.length === 0 && brokenItems.length === 0;

    return {
        type: 'CHECK_IN',
        room_id: room.id,
        contract_id: contract.id,
        template_comparison: results,
        condition_summary: conditionSummary,
        can_check_in: canCheckIn,
        failure_reasons: failureReasons,
        extra_assets: extra,
        unknown_qr_codes
    };
};

const residentConfirmCheckIn = async (contractId, assetsInput, notes, user) => {
    const { contract, room } = await resolveResidentContract(user, contractId, { forCheckIn: true });

    const qrCodes = assetsInput.map(a => a.qr_code);
    const conditionMap = {};
    for (const a of assetsInput) {
        conditionMap[a.qr_code] = { condition: a.condition, note: a.note || null };
    }

    const { results, assetsToAssign, extra, unknown_qr_codes, scannedAssets } = await computeCheckInDiff(room, qrCodes);

    // Validate: no SHORT items
    const failureReasons = [];

    const shortItems = results.filter(r => r.status === 'SHORT');
    for (const item of shortItems) {
        failureReasons.push(`${item.asset_type_name}: cần ${item.expected}, scan ${item.actual}`);
    }

    // Build condition summary
    const conditionSummary = scannedAssets.map(asset => ({
        qr_code: asset.qr_code,
        asset_id: asset.id,
        asset_type_name: asset.asset_type ? asset.asset_type.name : null,
        condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
        note: conditionMap[asset.qr_code]?.note || null
    }));

    const brokenItems = conditionSummary.filter(c => c.condition === 'BROKEN');
    for (const item of brokenItems) {
        failureReasons.push(`${item.asset_type_name} (${item.qr_code}): tình trạng BROKEN${item.note ? ' - ' + item.note : ''}`);
    }

    if (failureReasons.length > 0) {
        throw {
            status: 400,
            message: 'Check-in thất bại',
            data: {
                failure_reasons: failureReasons,
                template_comparison: results,
                condition_summary: conditionSummary
            }
        };
    }

    const transaction = await sequelize.transaction();
    try {
        const inspection = await inspectionRepository.createInspection({
            room_id: room.id,
            performed_by: user.id,
            type: 'CHECK_IN',
            status: 'NO_DISCREPANCY',
            penalty_total: 0,
            notes
        }, { transaction });

        // Create per-asset condition items
        const itemRows = scannedAssets.map(asset => ({
            inspection_id: inspection.id,
            asset_id: asset.id,
            qr_code: asset.qr_code,
            condition: conditionMap[asset.qr_code]?.condition || 'GOOD',
            note: conditionMap[asset.qr_code]?.note || null
        }));
        const items = await inspectionRepository.bulkCreateInspectionItems(itemRows, { transaction });

        // Validate building matching before assignment
        for (const asset of assetsToAssign) {
            if (asset.building_id !== room.building_id) {
                throw new AppError(`Tài sản ${asset.name} (${asset.qr_code}) không thuộc tòa nhà này.`, 400);
            }
        }

        // Assign assets to room
        if (assetsToAssign.length > 0) {
            const assetIds = assetsToAssign.map(a => a.id);
            await inspectionRepository.updateAssetsByIds(assetIds, { current_room_id: room.id, status: 'IN_USE' }, { transaction });

            const historyRows = assetsToAssign.map(asset => ({
                asset_id: asset.id,
                from_room_id: asset.current_room_id,
                to_room_id: room.id,
                from_status: asset.status,
                to_status: 'IN_USE',
                action: 'CHECK_IN',
                performed_by: user.id,
                notes: `inspection:${inspection.id}`
            }));
            await inspectionRepository.bulkCreateAssetHistory(historyRows, { transaction });
        }

        // Contract → ACTIVE, Room → OCCUPIED (onboarding complete)
        await inspectionRepository.updateContractById(contract.id, { status: 'ACTIVE' }, { transaction });
        await inspectionRepository.updateRoomStatus(room.id, 'OCCUPIED', { transaction });

        await transaction.commit();

        return {
            inspection: inspection.toJSON(),
            items: items.map(i => i.toJSON()),
            assets_assigned: assetsToAssign.length,
            room_id: room.id
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// GET /api/inspections?room_id=
const getInspectionsByRoom = async (roomId, caller, options = {}) => {
    const { contractId } = options;
    const room = await inspectionRepository.findRoomById(roomId);
    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    // Access control
    if (caller.role === ROLES.BUILDING_MANAGER || caller.role === ROLES.STAFF) {
        ensureBuildingAccess(caller, room);
    } else if (caller.role === ROLES.RESIDENT) {
        const hasContract = await inspectionRepository.countContractsForRoomAndCustomer(roomId, caller.id);
        if (!hasContract) throw new AppError('Bạn không có quyền xem kiểm tra phòng này', 403);
    }
    // ADMIN: no restriction

    let contract = null;
    if (contractId) {
        contract = await resolveContractInspectionContext(roomId, contractId, caller);
    }

    const inspections = await inspectionRepository.findInspectionsByRoom(roomId);

    const normalized = inspections.map((inspection) => inspection.toJSON());

    if (!contract) {
        return normalized.sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at));
    }

    return selectContractInspections(normalized, contract);
};

module.exports = { previewInspection, confirmInspection, residentPreviewCheckIn, residentConfirmCheckIn, getInspectionsByRoom };
