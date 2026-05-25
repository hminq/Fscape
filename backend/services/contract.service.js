const { sequelize } = require('../config/db');
const contractRepository = require('../repositories/contract.repository');
const { ROLES } = require('../constants/roles');
const AppError = require('../utils/AppError');
const {
    CONTRACT_LENGTH,
    isValidContractLength,
    isValidBookingBillingCycle
} = require('../constants/bookingEnums');
const { billingCycleToMonths } = require('../utils/billingCycle.util');
const { SIGNATURE_EXPIRY_MS } = require('../constants/contract');
const { RENEWAL_MAX_GAP_DAYS } = require('../constants/jobTimeRules');
const { generateSequentialId, generateNumberedId } = require('../utils/generateId');
const { INVOICE_TYPE } = require('../constants/invoiceEnums');
const { sendContractSigningEmail, sendInvoiceCreatedEmail, sendCheckInReminderEmail, sendManualExpiringReminderEmail, sendContractTerminatedEmail } = require('../utils/mail.util');
const { generateContractPdf } = require('../utils/pdf.util');
const auditService = require('./audit.service');
const { parseUTCDate } = require('../utils/date.util');
const { createNotification } = require('./notification.service');
const { generateRequestNumber } = require('./request.service');
const { getRuntimeConfig } = require('../config/runtimeConfig');
const { enqueueEmailJob } = require('./emailQueue.service');
const { EMAIL_JOB_TYPES } = require('../constants/emailJobs');

/* Helpers */

const TIMESTAMP_FIELDS = ['created_at', 'updated_at', 'createdAt', 'updatedAt'];

const stripTimestamps = (obj) => {
    if (!obj) return obj;
    const plain = typeof obj.toJSON === 'function' ? obj.toJSON() : { ...obj };
    TIMESTAMP_FIELDS.forEach(f => delete plain[f]);
    return plain;
};

const formatCurrency = (amount) => {
    return Number(amount).toLocaleString('vi-VN');
};

const enqueueEmailJobSafely = (type, payload, logContext) => {
    enqueueEmailJob(type, payload)
        .catch(err => console.error(`[ContractService] Failed to enqueue ${logContext}:`, err));
};

const formatDate = (date) => {
    if (!date) return '';
    const d = parseUTCDate(date);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const formatGender = (gender) => {
    switch ((gender || '').toUpperCase()) {
        case 'MALE':
            return 'Nam';
        case 'FEMALE':
            return 'Nữ';
        case 'OTHER':
            return 'Khác';
        default:
            return '';
    }
};

const addMonths = (dateStr, months) => {
    const d = parseUTCDate(dateStr);
    d.setUTCMonth(d.getUTCMonth() + months);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const toPublicAssetUrl = (value) => {
    if (!value) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    const { urls } = getRuntimeConfig();
    const base = urls.cloudFront.replace(/\/$/, '');
    const path = value.replace(/^\//, '');
    return base ? `${base}/${path}` : value;
};

/**
 * Replace {{variable}} placeholders in HTML template with values.
 */
const renderTemplate = (htmlContent, fields) => {
    let rendered = htmlContent;
    for (const [key, value] of Object.entries(fields)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    return rendered;
};

/* Queries */

/**
 * Get contract list.
 * - ADMIN: can view all contracts with timestamps.
 * - BUILDING_MANAGER: can view contracts in assigned building, without timestamps.
 */
const getAllContracts = async ({ page = 1, limit = 10, status, building_id, search } = {}, user) => {
    const isAdmin = user.role === ROLES.ADMIN;

    // BM: force scope to their building
    if (!isAdmin && !user.building_id) {
        throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
    }
    const scopedBuildingId = isAdmin ? building_id : user.building_id;

    const { count, rows } = await contractRepository.findAndCountContracts(
        { page, limit, status, building_id, search },
        scopedBuildingId
    );

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: isAdmin ? rows : rows.map(stripTimestamps)
    };
};

/**
 * Get contract details.
 * - ADMIN: full access.
 * - BUILDING_MANAGER: only assigned building, without timestamps.
 * - RESIDENT / CUSTOMER: own contracts only.
 */
const getContractById = async (id, user) => {
    const contract = await contractRepository.findContractDetailById(id);
    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

    // BM scope check
    if (user.role === ROLES.BUILDING_MANAGER) {
        if (!user.building_id) {
            throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
        }
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw new AppError('Bạn không có quyền truy cập hợp đồng này (khác tòa nhà).', 403);
        }
        return stripTimestamps(contract);
    }

    // RESIDENT / CUSTOMER: only own contracts
    if (user.role === ROLES.RESIDENT || user.role === ROLES.CUSTOMER) {
        if (contract.customer_id !== user.id) {
            throw new AppError('Bạn không có quyền truy cập hợp đồng này', 403);
        }
    }

    return contract;
};

/**
 * Update contract metadata.
 * - ADMIN: can update any contract.
 * - BUILDING_MANAGER: can update contracts in assigned building.
 */
const updateContract = async (id, data, user) => {
    const contract = await contractRepository.findContractWithRoomById(id);
    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

    // BM scope check
    if (user.role === ROLES.BUILDING_MANAGER) {
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw new AppError('Bạn không có quyền chỉnh sửa hợp đồng này', 403);
        }
    }

    return await contractRepository.updateContract(contract, data);
};

/**
 * Get contracts of current user (RESIDENT / CUSTOMER).
 */
const getMyContracts = async (userId, query = {}) => {
    const {
        page = 1,
        limit = 10,
    } = query;

    const { count, rows } = await contractRepository.findAndCountMyContracts(userId, query);

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows,
    };
};

/* Contract creation */

/**
 * Create contract from a DEPOSIT_PAID booking.
 *
 * 1. Load default contract template.
 * 2. Load customer, room, building, and manager.
 * 3. Build dynamic_fields and rendered_content.
 * 4. Insert contract with PENDING_CUSTOMER_SIGNATURE status.
 * 5. Link booking.contract_id.
 *
 * @param {string} bookingId - Booking UUID in DEPOSIT_PAID status
 * @returns {Object} Contract instance
 */
const createContractFromBooking = async (bookingId) => {
    const transaction = await sequelize.transaction();

    try {
        // 1) Load booking, room, room type, and building.
        const booking = await contractRepository.findDepositPaidBookingWithRoom(bookingId, { transaction });

        if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);
        if (booking.status !== 'DEPOSIT_PAID') {
            throw new AppError('Đơn đặt phòng chưa ở trạng thái đã đặt cọc', 400);
        }

        const room = booking.room;
        const building = room.building;
        const roomType = room.room_type;

        // 2) Load customer and profile.
        const customer = await contractRepository.findUserWithProfileById(booking.customer_id, { transaction });
        if (!customer) throw new AppError('Không tìm thấy khách hàng', 404);

        // 3) Load building manager.
        const manager = await contractRepository.findActiveBuildingManager(building.id, { transaction });
        if (!manager) throw new AppError('Không tìm thấy Quản lý tòa nhà đang hoạt động cho tòa nhà này', 400);

        // 4) Load default contract template.
        const template = await contractRepository.findDefaultTemplate({ transaction });
        if (!template) throw new AppError('Không tìm thấy mẫu hợp đồng mặc định đang hoạt động', 400);

        // 5) Resolve dates and billing values.
        const durationMonths = Number(booking.duration_months);
        const resolvedDurationMonths = isValidContractLength(durationMonths)
            ? durationMonths
            : CONTRACT_LENGTH.SIX_MONTHS;
        const startDate = booking.check_in_date;
        const endDate = addMonths(startDate, resolvedDurationMonths);
        const termType = 'FIXED_TERM';
        // Trust billing cycle already validated at booking time.
        const billingCycle = booking.billing_cycle;

        // 6. Generate contract number
        const currentCount = await contractRepository.countContracts({ transaction });
        const contractNumber = generateSequentialId('CON', currentCount);

        // 7. Build dynamic_fields
        const profile = customer.profile;
        const dynamicFields = {
            contract_number: contractNumber,
            start_date: formatDate(startDate),
            end_date: endDate ? formatDate(endDate) : 'Không xác định',
            building_address: building.address || '',
            building_name: building.name,
            manager_name: `${manager.last_name || ''} ${manager.first_name || ''}`.trim(),
            customer_name: `${customer.last_name || ''} ${customer.first_name || ''}`.trim(),
            customer_date_of_birth: formatDate(profile?.date_of_birth),
            customer_gender: formatGender(profile?.gender),
            customer_phone: customer.phone || '',
            customer_email: customer.email || '',
            customer_permanent_address: profile?.permanent_address || '',
            customer_emergency_contact_name: profile?.emergency_contact_name || '',
            customer_emergency_contact_phone: profile?.emergency_contact_phone || '',
            room_number: room.room_number,
            room_type: roomType?.name || '',
            term_type: 'Có thời hạn',
            base_rent: formatCurrency(roomType?.base_price || 0),
            deposit_amount: formatCurrency(booking.deposit_amount)
            // NOTE: Do NOT include manager_signature / customer_signature here.
            // The {{customer_signature}} and {{manager_signature}} placeholders
            // must remain in rendered_content so customerSign / managerSign can
            // replace them with <img> tags when the parties actually sign.
        };

        // 8. Render HTML from template
        const renderedContent = renderTemplate(template.content, dynamicFields);

        // 9. Create contract
        const contract = await contractRepository.createContract({
            contract_number: contractNumber,
            template_id: template.id,
            room_id: room.id,
            customer_id: customer.id,
            manager_id: manager.id,
            term_type: termType,
            start_date: startDate,
            end_date: endDate,
            duration_months: resolvedDurationMonths,
            base_rent: roomType?.base_price || 0,
            deposit_amount: booking.deposit_amount,
            deposit_original_amount: booking.deposit_amount,
            deposit_balance: booking.deposit_amount,
            billing_cycle: billingCycle,
            dynamic_fields: dynamicFields,
            rendered_content: renderedContent,
            status: 'PENDING_CUSTOMER_SIGNATURE',
            signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS)
        }, { transaction });

        // 10. Link booking to contract
        await contractRepository.updateBooking(booking, { contract_id: contract.id }, { transaction });

        await transaction.commit();

        // Send signing email with direct link
        const { urls } = getRuntimeConfig();
        const clientUrl = urls.client;
        const signingUrl = `${clientUrl}/sign?contract_id=${contract.id}`;

        enqueueEmailJobSafely(EMAIL_JOB_TYPES.CONTRACT_SIGNING_INVITE, {
            email: customer.email,
            customerName: dynamicFields.customer_name,
            contractNumber,
            roomNumber: room.room_number,
            buildingName: building.name,
            signingUrl
        }, 'contract signing invitation email');

        return contract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/* Contract renewal */

/**
 * Renew contract (RESIDENT only).
 *
 * 1. Validate owner and role.
 * 2. Validate contract status.
 * 3. Ensure no pending renewal exists.
 * 4. Validate duration_months and billing_cycle.
 * 5. Create renewed contract linked by renewed_from_contract_id.
 * 6. Create ContractExtension audit trail.
 * 7. Send renewal signing email.
 *
 * @param {string} contractId - Contract UUID to renew
 * @param {Object} body - { duration_months, billing_cycle?, start_date?, notes? }
 * @param {Object} user - Authenticated user (req.user)
 * @returns {Object} New contract instance
 */
const renewContract = async (contractId, body, user) => {
    const transaction = await sequelize.transaction();

    try {
        // 1. Fetch old contract with associations
        const oldContract = await contractRepository.findRenewableContractById(contractId, { transaction });
        if (!oldContract) throw new AppError('Không tìm thấy hợp đồng', 404);

        // 2. Only RESIDENT who owns the contract can renew
        if (user.role !== ROLES.RESIDENT) {
            throw new AppError('Chỉ cư dân mới có thể gia hạn hợp đồng', 403);
        }
        if (oldContract.customer_id !== user.id) {
            throw new AppError('Bạn không có quyền gia hạn hợp đồng này', 403);
        }

        // 3. Only ACTIVE or EXPIRING_SOON contracts can be renewed
        if (!['ACTIVE', 'EXPIRING_SOON'].includes(oldContract.status)) {
            throw new AppError('Chỉ có thể gia hạn hợp đồng đang hoạt động hoặc sắp hết hạn', 400);
        }

        // 4. Prevent duplicate pending renewals (only block if one is actively being signed)
        const existingRenewal = await contractRepository.findPendingRenewal(contractId, { transaction });
        if (existingRenewal) {
            throw new AppError('Hợp đồng này đã có yêu cầu gia hạn đang chờ xử lý', 400);
        }

        // 5. Validate duration_months
        const { duration_months, billing_cycle, notes, start_date } = body;
        if (!duration_months || !isValidContractLength(duration_months)) {
            throw new AppError('Thời hạn hợp đồng phải là 6 hoặc 12 tháng', 400);
        }

        // 6. Validate billing_cycle if provided
        const resolvedBillingCycle = billing_cycle || oldContract.billing_cycle;
        if (billing_cycle && !isValidBookingBillingCycle(billing_cycle)) {
            throw new AppError('Chu kỳ thanh toán không hợp lệ', 400);
        }

        // 7. Validate start_date: must be within [old.end_date, old.end_date + RENEWAL_MAX_GAP_DAYS]
        const oldEndDate = parseUTCDate(oldContract.end_date);
        const maxStartDate = new Date(oldEndDate);
        maxStartDate.setUTCDate(maxStartDate.getUTCDate() + RENEWAL_MAX_GAP_DAYS);

        let startDate = oldContract.end_date;
        if (start_date) {
            const requested = parseUTCDate(start_date);
            if (requested < oldEndDate || requested > maxStartDate) {
                throw new AppError(`Ngày bắt đầu phải từ ${oldContract.end_date} đến ${maxStartDate.toISOString().split('T')[0]}`, 400);
            }
            startDate = start_date;
        }

        const room = oldContract.room;
        const building = room.building;
        const roomType = room.room_type;

        // 8. Fetch customer + profile
        const customer = await contractRepository.findUserWithProfileById(oldContract.customer_id, { transaction });
        if (!customer) throw new AppError('Không tìm thấy khách hàng', 404);

        // 9. Fetch building manager
        const manager = await contractRepository.findActiveBuildingManager(building.id, { transaction });
        if (!manager) throw new AppError('Không tìm thấy Quản lý tòa nhà đang hoạt động cho tòa nhà này', 400);

        // 10. Fetch default contract template
        const template = await contractRepository.findDefaultTemplate({ transaction });
        if (!template) throw new AppError('Không tìm thấy mẫu hợp đồng mặc định đang hoạt động', 400);

        // 11. Calculate dates
        const durationMonths = Number(duration_months);
        const endDate = addMonths(startDate, durationMonths);

        // 11. Generate contract number
        const currentCount = await contractRepository.countContracts({ transaction });
        const contractNumber = generateSequentialId('CON', currentCount);

        // 12. Build dynamic_fields (same pattern as createContractFromBooking)
        const profile = customer.profile;
        const dynamicFields = {
            contract_number: contractNumber,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            building_address: building.address || '',
            building_name: building.name,
            manager_name: `${manager.last_name || ''} ${manager.first_name || ''}`.trim(),
            customer_name: `${customer.last_name || ''} ${customer.first_name || ''}`.trim(),
            customer_date_of_birth: formatDate(profile?.date_of_birth),
            customer_gender: formatGender(profile?.gender),
            customer_phone: customer.phone || '',
            customer_email: customer.email || '',
            customer_permanent_address: profile?.permanent_address || '',
            customer_emergency_contact_name: profile?.emergency_contact_name || '',
            customer_emergency_contact_phone: profile?.emergency_contact_phone || '',
            room_number: room.room_number,
            room_type: roomType?.name || '',
            term_type: 'Có thời hạn',
            base_rent: formatCurrency(roomType?.base_price || 0),
            deposit_amount: formatCurrency(oldContract.deposit_original_amount)
        };

        // 13. Render HTML from template
        const renderedContent = renderTemplate(template.content, dynamicFields);

        // 14. Create new contract
        const newContract = await contractRepository.createContract({
            contract_number: contractNumber,
            template_id: template.id,
            room_id: room.id,
            customer_id: customer.id,
            manager_id: manager.id,
            term_type: 'FIXED_TERM',
            start_date: startDate,
            end_date: endDate,
            duration_months: durationMonths,
            base_rent: roomType?.base_price || 0,
            deposit_amount: oldContract.deposit_original_amount,
            deposit_original_amount: oldContract.deposit_original_amount,
            deposit_balance: oldContract.deposit_original_amount,
            billing_cycle: resolvedBillingCycle,
            dynamic_fields: dynamicFields,
            rendered_content: renderedContent,
            status: 'PENDING_CUSTOMER_SIGNATURE',
            signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS),
            renewed_from_contract_id: oldContract.id,
            notes: notes || null
        }, { transaction });

        // 15. Create ContractExtension record (audit trail)
        await contractRepository.createContractExtension({
            contract_id: newContract.id,
            previous_end_date: oldContract.end_date,
            new_end_date: endDate,
            extension_months: durationMonths,
            reason: notes || 'Gia hạn hợp đồng theo yêu cầu cư dân'
        }, { transaction });

        await transaction.commit();

        // 16. Send renewal signing email
        const { urls } = getRuntimeConfig();
        const clientUrl = urls.client;
        const signingUrl = `${clientUrl}/sign?contract_id=${newContract.id}`;

        enqueueEmailJobSafely(EMAIL_JOB_TYPES.RENEWAL_SIGNING_INVITE, {
            email: customer.email,
            customerName: dynamicFields.customer_name,
            contractNumber,
            oldContractNumber: oldContract.contract_number,
            roomNumber: room.room_number,
            buildingName: building.name,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            signingUrl
        }, 'renewal signing invitation email');

        return newContract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/* Contract signing */

/**
 * Customer / Resident ký hợp đồng.
 *
 *   1. Verify status = PENDING_CUSTOMER_SIGNATURE
 *   2. Verify user owns the contract
 *   3. Set customer_signature_url + customer_signed_at
 *   4. Update rendered_content with signature image
 *   5. Status → PENDING_MANAGER_SIGNATURE
 *   6. Audit log
 */
const customerSign = async (contractId, signatureUrl, user, req) => {
    const contract = await contractRepository.findContractForCustomerSign(contractId);
    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

    if (contract.status !== 'PENDING_CUSTOMER_SIGNATURE') {
        throw new AppError('Hợp đồng không ở trạng thái chờ khách hàng ký', 400);
    }

    if (contract.signature_expires_at && new Date() > new Date(contract.signature_expires_at)) {
        throw new AppError('Thời hạn ký đã hết', 400);
    }

    if (contract.customer_id !== user.id) {
        throw new AppError('Bạn không có quyền ký hợp đồng này', 403);
    }

    const oldStatus = contract.status;

    // Update rendered_content: replace customer_signature placeholder with <img>
    const signatureImg = `<img src="${toPublicAssetUrl(signatureUrl)}" alt="Customer Signature" style="width:200px;height:80px;object-fit:contain" />`;
    let updatedContent = contract.rendered_content || '';
    updatedContent = updatedContent.replace('{{customer_signature}}', signatureImg);

    await contractRepository.updateContract(contract, {
        customer_signature_url: signatureUrl,
        customer_signed_at: new Date(),
        rendered_content: updatedContent,
        status: 'PENDING_MANAGER_SIGNATURE',
        signature_expires_at: new Date(Date.now() + SIGNATURE_EXPIRY_MS)
    });

    // Audit log
    await auditService.log({
        user,
        action: 'SIGN',
        entityType: 'contract',
        entityId: contract.id,
        oldValue: { status: oldStatus },
        newValue: { status: 'PENDING_MANAGER_SIGNATURE', customer_signature_url: signatureUrl },
        req
    });

    // Send email to Building Manager to sign
    const manager = await contractRepository.findUserById(contract.manager_id);
    const customer = await contractRepository.findUserById(contract.customer_id);
    if (manager && customer) {
        const { urls } = getRuntimeConfig();
        const adminUrl = urls.admin;
        const signingUrl = `${adminUrl}/building-manager/contracts?sign=${contract.id}`;
        const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
        const managerName = `${manager.last_name || ''} ${manager.first_name || ''}`.trim();

        enqueueEmailJobSafely(EMAIL_JOB_TYPES.MANAGER_SIGNING_INVITE, {
            email: manager.email,
            managerName,
            customerName,
            contractNumber: contract.contract_number,
            roomNumber: contract.room?.room_number || '',
            buildingName: contract.room?.building?.name || '',
            signingUrl
        }, 'manager signing invitation email');
    }

    return contract;
};

/**
 * Building Manager ký hợp đồng (bước cuối → ACTIVE).
 *
 *   1. Verify status = PENDING_MANAGER_SIGNATURE
 *   2. Verify BM manages the building
 *   3. Set manager_signature_url + manager_signed_at
 *   4. Update rendered_content with signature image
 *   5. Status → ACTIVE
 *   6. Room → OCCUPIED
 *   7. User role: CUSTOMER → RESIDENT
 *   8. Booking → CONVERTED
 *   9. Set next_billing_date
 *   10. Audit log
 */
const managerSign = async (contractId, signatureUrl, user, req) => {
    const transaction = await sequelize.transaction();

    try {
        const contract = await contractRepository.findContractForManagerSign(contractId, { transaction });
        if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

        if (contract.status !== 'PENDING_MANAGER_SIGNATURE') {
            throw new AppError('Hợp đồng không ở trạng thái chờ quản lý ký', 400);
        }

        if (contract.signature_expires_at && new Date() > new Date(contract.signature_expires_at)) {
            throw new AppError('Thời hạn ký đã hết', 400);
        }

        // BM scope check
        const contractBuildingId = contract.room?.building?.id;
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw new AppError('Bạn không có quyền ký hợp đồng này', 403);
        }

        const oldStatus = contract.status;

        // Update rendered_content: replace manager_signature placeholder with <img>
        const signatureImg = `<img src="${toPublicAssetUrl(signatureUrl)}" alt="Manager Signature" style="width:200px;height:80px;object-fit:contain" />`;
        let updatedContent = contract.rendered_content || '';
        updatedContent = updatedContent.replace('{{manager_signature}}', signatureImg);

        // Keep backward compatibility for legacy billing values, and support ALL_IN.
        const billingMonths = billingCycleToMonths(contract.billing_cycle);
        const nextBillingDate = billingMonths == null
            ? null
            : addMonths(contract.start_date, billingMonths);

        // Compute new billing timestamp fields
        const nextRentBillingAt = billingMonths == null
            ? null
            : parseUTCDate(addMonths(contract.start_date, billingMonths));
        const startUTC = parseUTCDate(contract.start_date);
        const nextServiceBillingAt = new Date(
            startUTC.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        // 1. Update contract → PENDING_FIRST_PAYMENT (awaiting 1st rent payment)
        await contractRepository.updateContract(contract, {
            manager_signature_url: signatureUrl,
            manager_signed_at: new Date(),
            rendered_content: updatedContent,
            status: 'PENDING_FIRST_PAYMENT',
            next_billing_date: nextBillingDate,
            next_rent_billing_at: nextRentBillingAt,
            next_service_billing_at: nextServiceBillingAt,
            signature_expires_at: null
        }, { transaction });

        // 2-4. Handle room, user role, and booking based on renewal vs new contract
        if (contract.renewed_from_contract_id) {
            // RENEWAL: do NOT finish old contract yet - defer to payment callback
            // Room stays OCCUPIED - no change needed
            // No booking to CONVERT - renewals don't create bookings

            // Safety net: restore RESIDENT role if cron downgraded it
            // (edge case: old contract expired before renewal was signed)
            const customer = await contractRepository.findUserById(contract.customer_id, { transaction });
            if (customer && customer.role === ROLES.CUSTOMER) {
                await contractRepository.updateUser(customer, {
                    role: ROLES.RESIDENT,
                    building_id: contractBuildingId
                }, { transaction });
            }
        } else {
            // NEW CONTRACT: room stays LOCKED, user stays CUSTOMER
            // Role promotion and room OCCUPIED happen later in the flow:
            //   - CUSTOMER → RESIDENT on 1st rent payment (payment callback)
            //   - Room → OCCUPIED on check-in (inspection service)

            // Booking → CONVERTED
            const booking = await contractRepository.findBookingByContractId(contract.id, { transaction });
            if (booking) {
                await contractRepository.updateBooking(booking, {
                    status: 'CONVERTED',
                    converted_at: new Date()
                }, { transaction });
            }
        }

        // 5. Create first RENT invoice
        const billingPeriodStart = contract.start_date; // YYYY-MM-DD string
        let billingPeriodEnd;
        let rentMonths;

        if (billingMonths == null) {
            // ALL_IN: single invoice covering the entire contract
            billingPeriodEnd = contract.end_date;
            rentMonths = Number(contract.duration_months);
        } else {
            // Subtract 1 day from end: e.g. Jan 1 + 3 months = Apr 1, end = Mar 31
            const endDate = parseUTCDate(addMonths(billingPeriodStart, billingMonths));
            endDate.setUTCDate(endDate.getUTCDate() - 1);
            billingPeriodEnd = endDate.toISOString().split('T')[0];
            rentMonths = billingMonths;
        }

        const roomRent = Number(contract.base_rent) * rentMonths;

        const firstInvoice = await contractRepository.createInvoice({
            invoice_number: generateNumberedId('INV'),
            contract_id: contract.id,
            invoice_type: INVOICE_TYPE.RENT,
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            room_rent: roomRent,
            request_fees: 0,
            penalty_fees: 0,
            total_amount: roomRent,
            status: 'UNPAID',
            due_date: contract.start_date
        }, { transaction });

        await contractRepository.createInvoiceItem({
            invoice_id: firstInvoice.id,
            item_type: 'RENT',
            description: `Tiền thuê phòng từ ${billingPeriodStart} đến ${billingPeriodEnd}`,
            quantity: 1,
            unit_price: roomRent,
            amount: roomRent
        }, { transaction });

        // 6. Audit log
        await auditService.log({
            user,
            action: 'SIGN',
            entityType: 'contract',
            entityId: contract.id,
            oldValue: { status: oldStatus },
            newValue: { status: 'PENDING_FIRST_PAYMENT', manager_signature_url: signatureUrl },
            req
        }, { transaction });

        await transaction.commit();

        // Generate final PDF and upload to S3 (async, non-blocking)
        generateContractPdf(contract.rendered_content, contract.contract_number)
            .then(async (pdfUrl) => {
                await contractRepository.updateContractPdfUrl(contract.id, pdfUrl);
                console.log(`[ContractService] PDF generated: ${pdfUrl}`);
            })
            .catch(err => console.error('[ContractService] Failed to generate PDF:', err));

        // Send signing confirmation + first invoice email to customer
        const customerForEmail = await contractRepository.findUserById(contract.customer_id);
        if (customerForEmail) {
            const customerName = `${customerForEmail.last_name || ''} ${customerForEmail.first_name || ''}`.trim();

            // Send first invoice notification email (customer must pay before check-in)
            const formatAmount = (v) => new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ';
            await sendInvoiceCreatedEmail(customerForEmail.email, {
                customerName,
                invoiceNumber: firstInvoice.invoice_number,
                invoiceId: firstInvoice.id,
                roomNumber: contract.room?.room_number || '',
                buildingName: contract.room?.building?.name || '',
                billingPeriod: `${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}`,
                totalAmount: formatAmount(roomRent),
                dueDate: formatDate(contract.start_date)
            }).catch(err => console.error('[ContractService] Failed to send invoice email:', err));
        }

        return contract;

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

const getContractStats = async (user) => {
    let scopedBuildingId;
    if (user?.role === ROLES.BUILDING_MANAGER) {
        if (!user.building_id) {
            throw new AppError('Quản lý tòa nhà chưa được phân công tòa nhà nào', 403);
        }
        scopedBuildingId = user.building_id;
    }

    const contracts = await contractRepository.findContractsForStats(scopedBuildingId);

    const byStatus = {
        pending_customer_signature: 0, pending_manager_signature: 0,
        pending_first_payment: 0, pending_check_in: 0,
        active: 0, expiring_soon: 0, finished: 0, terminated: 0,
    };
    const byBuilding = {};

    for (const c of contracts) {
        const key = c.status.toLowerCase();
        if (byStatus[key] !== undefined) byStatus[key]++;
        const bId = c.room?.building?.id;
        const bName = c.room?.building?.name || 'Khác';
        if (bId) {
            if (!byBuilding[bId]) byBuilding[bId] = { building_id: bId, name: bName, count: 0 };
            byBuilding[bId].count++;
        }
    }

    return { total: contracts.length, by_status: byStatus, by_building: Object.values(byBuilding).sort((a, b) => b.count - a.count) };
};

/* Manual reminder */

const REMINDER_STATUS_MAP = {
    SIGN: 'PENDING_CUSTOMER_SIGNATURE',
    PAY_FIRST_RENT: 'PENDING_FIRST_PAYMENT',
    CHECK_IN: 'PENDING_CHECK_IN',
    EXPIRING: 'EXPIRING_SOON',
};

const REMINDER_LABEL = {
    SIGN: 'ký hợp đồng',
    PAY_FIRST_RENT: 'thanh toán tiền phòng kỳ đầu',
    CHECK_IN: 'nhận phòng',
    EXPIRING: 'gia hạn hợp đồng',
};

const sendManualReminder = async (contractId, reminderType, user) => {
    const contract = await contractRepository.findContractForReminder(contractId);
    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

    // BM scope check
    if (user.role === ROLES.BUILDING_MANAGER) {
        const buildingId = contract.room?.building?.id;
        if (!buildingId || buildingId !== user.building_id) {
            throw new AppError('Bạn không có quyền thao tác trên hợp đồng này', 403);
        }
    }

    // Validate status matches reminder type
    const expectedStatus = REMINDER_STATUS_MAP[reminderType];
    if (contract.status !== expectedStatus) {
        throw new AppError(`Không thể gửi nhắc nhở ${REMINDER_LABEL[reminderType]} khi hợp đồng đang ở trạng thái hiện tại`, 400);
    }

    const customer = contract.customer;
    if (!customer?.email) {
        throw new AppError('Khách hàng không có email', 400);
    }

    const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
    const roomNumber = contract.room?.room_number || '';
    const buildingName = contract.room?.building?.name || '';
    const contractNumber = contract.contract_number;
    const { urls } = getRuntimeConfig();
    const signingUrl = `${urls.client}/sign?contract_id=${contractId}`;

    switch (reminderType) {
        case 'SIGN': {
            await sendContractSigningEmail(customer.email, {
                customerName, contractNumber, roomNumber, buildingName, signingUrl,
            });
            break;
        }
        case 'PAY_FIRST_RENT': {
            const invoice = await contractRepository.findFirstUnpaidRentInvoice(contractId);
            if (!invoice) throw new AppError('Không tìm thấy hóa đơn chưa thanh toán', 400);
            await sendInvoiceCreatedEmail(customer.email, {
                customerName,
                invoiceNumber: invoice.invoice_number,
                invoiceId: invoice.id,
                roomNumber,
                buildingName,
                billingPeriod: 'Kỳ đầu',
                totalAmount: formatCurrency(invoice.total_amount) + ' đ',
                dueDate: formatDate(invoice.due_date),
            });
            break;
        }
        case 'CHECK_IN': {
            await sendCheckInReminderEmail(customer.email, {
                customerName, contractNumber, contractId,
                roomNumber, buildingName,
                startDate: formatDate(contract.start_date),
            });
            break;
        }
        case 'EXPIRING': {
            await sendManualExpiringReminderEmail(customer.email, {
                customerName, contractNumber, contractId,
                roomNumber, buildingName,
                endDate: formatDate(contract.end_date),
            });
            break;
        }
    }

    return { message: `Đã gửi email nhắc nhở ${REMINDER_LABEL[reminderType]} đến ${customer.email}` };
};

/* Contract termination (ADMIN / BM) */

const PENDING_STATUSES = [
    'PENDING_CUSTOMER_SIGNATURE',
    'PENDING_MANAGER_SIGNATURE',
    'PENDING_FIRST_PAYMENT',
    'PENDING_CHECK_IN'
];

const ACTIVE_STATUSES = ['ACTIVE', 'EXPIRING_SOON'];

/**
 * Admin/BM chấm dứt hợp đồng.
 *
 * Case 1 - Pending contracts: terminate immediately, cancel booking, release room.
 * Case 2 - Active contracts: auto-create CHECKOUT request at IN_PROGRESS,
 *           staff then performs checkout inspection via existing flow.
 */
const terminateContract = async (contractId, body, user, req) => {
    const { termination_reason, assigned_staff_id } = body;

    const contract = await contractRepository.findContractForTermination(contractId);
    if (!contract) throw new AppError('Không tìm thấy hợp đồng', 404);

    if (['TERMINATED', 'FINISHED'].includes(contract.status)) {
        throw new AppError('Hợp đồng đã kết thúc hoặc đã bị chấm dứt', 400);
    }

    // BM scope check
    const contractBuildingId = contract.room?.building?.id;
    if (user.role === ROLES.BUILDING_MANAGER) {
        if (!contractBuildingId || contractBuildingId !== user.building_id) {
            throw new AppError('Bạn không có quyền thao tác trên hợp đồng này', 403);
        }
    }

    const isPending = PENDING_STATUSES.includes(contract.status);
    const isActive = ACTIVE_STATUSES.includes(contract.status);

    if (!isPending && !isActive) {
        throw new AppError(`Không thể chấm dứt hợp đồng ở trạng thái ${contract.status}`, 400);
    }

    // Active contracts require assigned_staff_id
    if (isActive && !assigned_staff_id) {
        throw new AppError('Cần chỉ định nhân viên để thực hiện trả phòng cho hợp đồng đang hoạt động', 400);
    }

    // Validate staff if provided
    let staff = null;
    if (assigned_staff_id) {
        staff = await contractRepository.findUserById(assigned_staff_id);
        if (!staff) throw new AppError('Không tìm thấy nhân viên', 400);
        if (staff.role !== ROLES.STAFF) throw new AppError('Người dùng được chỉ định không phải nhân viên', 400);
        if (staff.building_id !== contractBuildingId) {
            throw new AppError('Nhân viên không thuộc cùng tòa nhà với hợp đồng', 400);
        }
    }

    const transaction = await sequelize.transaction();
    const oldStatus = contract.status;

    try {
        if (isPending) {
            // Case 1: pending contract -> terminate immediately.
            await contractRepository.updateContract(contract, {
                status: 'TERMINATED',
                notes: `[Chấm dứt bởi ${user.role}] ${termination_reason}`,
                signature_expires_at: null
            }, { transaction });

            // Cancel associated booking
            const booking = await contractRepository.findBookingByContractId(contract.id, { transaction });
            if (booking) {
                await contractRepository.updateBooking(booking, {
                    status: 'CANCELLED',
                    cancelled_at: new Date(),
                    cancellation_reason: `Hợp đồng bị chấm dứt: ${termination_reason}`
                }, { transaction });

                await contractRepository.updateRoomStatus(booking.room_id, 'AVAILABLE', { transaction });
            }

            // Demote RESIDENT → CUSTOMER if no other active/expiring contracts
            if (contract.customer && contract.customer.role === ROLES.RESIDENT) {
                const otherActive = await contractRepository.countOtherActiveContracts(
                    contract.customer_id,
                    contract.id,
                    { transaction }
                );
                if (otherActive === 0) {
                    await contractRepository.updateUserById(contract.customer_id, { role: ROLES.CUSTOMER }, { transaction });
                }
            }

            // Audit log
            await auditService.log({
                user,
                action: 'UPDATE',
                entityType: 'contract',
                entityId: contract.id,
                oldValue: { status: oldStatus },
                newValue: { status: 'TERMINATED', reason: termination_reason },
                req
            }, { transaction });

            await transaction.commit();

            // Notifications (after commit)
            try {
                await createNotification({
                    type: 'CONTRACT_TERMINATED',
                    title: 'Hợp đồng bị chấm dứt',
                    content: `Hợp đồng ${contract.contract_number} đã bị chấm dứt. Lý do: ${termination_reason}`,
                    target_type: 'CONTRACT',
                    target_id: contract.id,
                    created_by: user.id,
                    specific_user_ids: [contract.customer_id]
                });
            } catch (err) {
                console.error('[ContractService] Failed to create termination notification:', err.message);
            }

            // Email customer
            if (contract.customer?.email) {
                const customerName = `${contract.customer.last_name || ''} ${contract.customer.first_name || ''}`.trim();
                sendContractTerminatedEmail(contract.customer.email, {
                    customerName,
                    contractNumber: contract.contract_number,
                    contractId: contract.id,
                    roomNumber: contract.room?.room_number || '',
                    buildingName: contract.room?.building?.name || '',
                    terminationReason: termination_reason
                }).catch(err => console.error('[ContractService] Failed to send termination email:', err.message));
            }

            return { contract, case: 'TERMINATED' };

        } else {
            // Case 2: active contract -> create IN_PROGRESS checkout request.
            await contractRepository.updateContract(contract, {
                notes: `[Chấm dứt bởi ${user.role}] ${termination_reason}`
            }, { transaction });

            const requestNumber = await generateRequestNumber();
            const checkoutRequest = await contractRepository.createRequest({
                request_number: requestNumber,
                room_id: contract.room_id,
                resident_id: contract.customer_id,
                assigned_staff_id: assigned_staff_id,
                request_type: 'CHECKOUT',
                title: `Checkout - Chấm dứt hợp đồng ${contract.contract_number}`,
                description: `Yêu cầu checkout tự động do hợp đồng bị chấm dứt. Lý do: ${termination_reason}`,
                status: 'IN_PROGRESS',
                service_price: 0
            }, { transaction });

            // Create status history entries showing the skipped chain
            const statusChain = [
                { from: null, to: 'PENDING' },
                { from: 'PENDING', to: 'ASSIGNED' },
                { from: 'ASSIGNED', to: 'PRICE_PROPOSED' },
                { from: 'PRICE_PROPOSED', to: 'APPROVED' },
                { from: 'APPROVED', to: 'IN_PROGRESS' }
            ];
            for (const entry of statusChain) {
                await contractRepository.createRequestStatusHistory({
                    request_id: checkoutRequest.id,
                    from_status: entry.from,
                    to_status: entry.to,
                    changed_by: user.id,
                    reason: 'Tự động tạo do chấm dứt hợp đồng'
                }, { transaction });
            }

            // Audit log
            await auditService.log({
                user,
                action: 'UPDATE',
                entityType: 'contract',
                entityId: contract.id,
                oldValue: { status: oldStatus },
                newValue: { notes: contract.notes, checkout_request_id: checkoutRequest.id, reason: termination_reason },
                req
            }, { transaction });

            await transaction.commit();

            // Notifications (after commit)
            try {
                // Notify resident
                await createNotification({
                    type: 'CONTRACT_TERMINATION_INITIATED',
                    title: 'Hợp đồng sắp bị chấm dứt',
                    content: `Hợp đồng ${contract.contract_number} sẽ bị chấm dứt. Nhân viên sẽ liên hệ bạn để thực hiện trả phòng. Lý do: ${termination_reason}`,
                    target_type: 'CONTRACT',
                    target_id: contract.id,
                    created_by: user.id,
                    specific_user_ids: [contract.customer_id]
                });

                // Notify assigned staff
                await createNotification({
                    type: 'CHECKOUT_REQUEST_ASSIGNED',
                    title: 'Nhiệm vụ trả phòng mới',
                    content: `Bạn được giao thực hiện trả phòng ${contract.room?.room_number || ''} (hợp đồng ${contract.contract_number}).`,
                    target_type: 'REQUEST',
                    target_id: checkoutRequest.id,
                    created_by: user.id,
                    specific_user_ids: [assigned_staff_id]
                });
            } catch (err) {
                console.error('[ContractService] Failed to create termination notifications:', err.message);
            }

            // Email customer
            if (contract.customer?.email) {
                const customerName = `${contract.customer.last_name || ''} ${contract.customer.first_name || ''}`.trim();
                sendContractTerminatedEmail(contract.customer.email, {
                    customerName,
                    contractNumber: contract.contract_number,
                    contractId: contract.id,
                    roomNumber: contract.room?.room_number || '',
                    buildingName: contract.room?.building?.name || '',
                    terminationReason: termination_reason
                }).catch(err => console.error('[ContractService] Failed to send termination email:', err.message));
            }

            return { contract, checkoutRequest, case: 'CHECKOUT_CREATED' };
        }
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = {
    getAllContracts,
    getContractById,
    getMyContracts,
    createContractFromBooking,
    renewContract,
    customerSign,
    managerSign,
    updateContract,
    getContractStats,
    sendManualReminder,
    terminateContract
};
