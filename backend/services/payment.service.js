const { sequelize } = require('../config/db');
const getPayOS = require('../utils/payos');
const payosConfig = require('../config/payos.config');
const contractService = require('./contract.service');
const paymentRepository = require('../repositories/payment.repository');
const { parseUTCDate } = require('../utils/date.util');
const { enqueueEmailJob } = require('./emailQueue.service');
const { EMAIL_JOB_TYPES } = require('../constants/emailJobs');
const { getRuntimeConfig } = require('../config/runtimeConfig');

const AppError = require('../utils/AppError');
const PAYOS_GATEWAY_ERROR = new AppError('Cổng thanh toán đang gặp sự cố. Vui lòng thử lại sau.', 502, 'PAYMENT_GATEWAY_ERROR');

/**
 * Resolve amount sent to PayOS.
 * Uses PAYOS_TEST_AMOUNT when provided.
 */
const getPayosAmount = (realAmount) => {
    const { payos } = getRuntimeConfig();
    const testAmount = payos.testAmount;
    if (testAmount) return Number(testAmount);
    return Math.round(Number(realAmount));
};

const normalizePayosCreateError = (error, context = {}) => {
    console.error('[PayOS] Failed to create payment link:', {
        message: error?.message,
        context
    });

    return PAYOS_GATEWAY_ERROR;
};

const formatCurrency = (amount) => `${Number(amount).toLocaleString('vi-VN')}đ`;

const enqueueEmailJobSafely = (type, payload, logContext) => {
    enqueueEmailJob(type, payload)
        .catch(err => console.error(`[PaymentService] Failed to enqueue ${logContext}:`, err));
};

const formatDateTime = (date) => {
    if (!date) return '';
    const formatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'UTC',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
    return `${formatted} UTC`;
};

const formatDate = (date) => {
    if (!date) return '';
    const d = parseUTCDate(date);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

const getPaymentTypeLabel = (paymentType) => {
    switch (paymentType) {
        case 'DEPOSIT':
            return 'Đặt cọc';
        case 'RENT':
            return 'Tiền phòng';
        case 'REQUEST':
        case 'SERVICE':
            return 'Phí dịch vụ';
        default:
            return 'Thanh toán';
    }
};

const createBookingPaymentUrlPayOS = async (userId, booking_id) => {
    const booking = await paymentRepository.findPendingBookingForDeposit(booking_id, userId);

    if (!booking) {
        throw new AppError("Không tìm thấy đơn đặt phòng hợp lệ hoặc đơn đã được xử lý", 404);
    }

    const orderCode = Date.now();
    const paymentNumber = `PAY-${orderCode}`;

    try {
        return await sequelize.transaction(async (transaction) => {
            const payment = await paymentRepository.createPayment({
                payment_number: paymentNumber,
                user_id: userId,
                amount: booking.deposit_amount, // Always persist real amount in DB.
                payment_type: 'DEPOSIT',
                status: 'PENDING',
                gateway_transaction_id: String(orderCode)
            }, { transaction });

            await paymentRepository.updateBooking(booking, { deposit_payment_id: payment.id }, { transaction });

            // Expire payment link in 1 hour.
            const expiredAt = Math.floor(Date.now() / 1000) + 3600;

            const paymentLink = await getPayOS().paymentRequests.create({
                orderCode,
                amount: getPayosAmount(booking.deposit_amount),
                description: booking.booking_number,
                items: [{ name: `Đặt cọc ${booking.booking_number}`, quantity: 1, price: getPayosAmount(booking.deposit_amount) }],
                returnUrl: payosConfig.returnUrl,
                cancelUrl: payosConfig.cancelUrl,
                expiredAt,
            });

            if (!paymentLink?.checkoutUrl) {
                throw new Error('PayOS did not return checkoutUrl');
            }

            return { checkoutUrl: paymentLink.checkoutUrl, orderCode, amount: booking.deposit_amount };
        });
    } catch (error) {
        if (error?.status) throw error;
        throw normalizePayosCreateError(error, { type: 'booking', bookingId: booking_id, userId });
    }
};

const createInvoicePaymentUrlPayOS = async (userId, invoice_id) => {
    const invoice = await paymentRepository.findUnpaidInvoiceForUser(invoice_id, userId);

    if (!invoice) {
        throw new AppError("Không tìm thấy hóa đơn cần thanh toán", 404);
    }

    const paymentType = invoice.invoice_type === 'SERVICE' ? 'REQUEST' : 'RENT';
    const orderCode = Date.now();
    const paymentNumber = `PAY-INV-${orderCode}`;

    try {
        return await sequelize.transaction(async (transaction) => {
            await paymentRepository.createPayment({
                payment_number: paymentNumber,
                invoice_id: invoice.id,
                contract_id: invoice.contract_id,
                user_id: userId,
                amount: invoice.total_amount,
                payment_type: paymentType,
                status: 'PENDING',
                gateway_transaction_id: String(orderCode)
            }, { transaction });

            // Expire payment link in 24 hours.
            const expiredAt = Math.floor(Date.now() / 1000) + 86400;

            const paymentLink = await getPayOS().paymentRequests.create({
                orderCode,
                amount: getPayosAmount(invoice.total_amount),
                description: invoice.invoice_number,
                items: [{ name: `Thanh toán ${invoice.invoice_number}`, quantity: 1, price: getPayosAmount(invoice.total_amount) }],
                returnUrl: payosConfig.returnUrl,
                cancelUrl: payosConfig.cancelUrl,
                expiredAt,
            });

            if (!paymentLink?.checkoutUrl) {
                throw new Error('PayOS did not return checkoutUrl');
            }

            return { checkoutUrl: paymentLink.checkoutUrl, orderCode, amount: invoice.total_amount };
        });
    } catch (error) {
        if (error?.status) throw error;
        throw normalizePayosCreateError(error, { type: 'invoice', invoiceId: invoice_id, userId });
    }
};

/**
 * Shared business flow after successful PayOS payment.
 */
const processSuccessPayment = async (payment, gatewayResponse) => {
    const transaction = await sequelize.transaction();
    let depositPaidBookingId = null;
    let paymentReceiptEmail = null;
    let welcomeCheckInEmail = null;

    try {
        await paymentRepository.updatePayment(payment, {
            status: 'SUCCESS',
            paid_at: new Date(),
            gateway_response: gatewayResponse
        }, { transaction });

        if (payment.payment_type === 'DEPOSIT') {
            const booking = await paymentRepository.findBookingByDepositPaymentId(payment.id, { transaction });
            if (booking) {
                await paymentRepository.updateBooking(booking, {
                    status: 'DEPOSIT_PAID',
                    deposit_paid_at: new Date()
                }, { transaction });
                depositPaidBookingId = booking.id;

                const customer = await paymentRepository.findUserById(booking.customer_id, { transaction });
                if (customer?.email) {
                    const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
                    paymentReceiptEmail = {
                        email: customer.email,
                        customerName,
                        paymentNumber: payment.payment_number,
                        paymentId: payment.id,
                        paymentTypeLabel: getPaymentTypeLabel(payment.payment_type),
                        referenceNumber: booking.booking_number,
                        roomNumber: booking.room?.room_number || '',
                        buildingName: booking.room?.building?.name || '',
                        amount: formatCurrency(payment.amount),
                        paidAt: formatDateTime(payment.paid_at),
                    };
                }
            }
        } else if (
            payment.payment_type === 'RENT'
            || payment.payment_type === 'REQUEST'
            || payment.payment_type === 'SERVICE'
        ) {
            const invoice = await paymentRepository.findInvoiceById(payment.invoice_id, { transaction });
            if (invoice) {
                await paymentRepository.updateInvoice(invoice, {
                    status: 'PAID',
                    paid_at: new Date()
                }, { transaction });

                const contract = await paymentRepository.findContractWithRoomById(invoice.contract_id, { transaction });
                const customer = contract
                    ? await paymentRepository.findUserById(contract.customer_id, { transaction })
                    : null;

                if (customer?.email) {
                    const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
                    paymentReceiptEmail = {
                        email: customer.email,
                        customerName,
                        paymentNumber: payment.payment_number,
                        paymentId: payment.id,
                        paymentTypeLabel: getPaymentTypeLabel(payment.payment_type),
                        referenceNumber: invoice.invoice_number,
                        roomNumber: contract?.room?.room_number || '',
                        buildingName: contract?.room?.building?.name || '',
                        amount: formatCurrency(payment.amount),
                        paidAt: formatDateTime(payment.paid_at),
                    };
                }

                if (contract && contract.status === 'PENDING_FIRST_PAYMENT') {
                    if (invoice.billing_period_start === contract.start_date) {
                        if (contract.renewed_from_contract_id) {
                            await paymentRepository.updateContract(contract, { status: 'ACTIVE' }, { transaction });

                            const oldContract = await paymentRepository.findContractById(
                                contract.renewed_from_contract_id, { transaction }
                            );
                            if (oldContract && ['ACTIVE', 'EXPIRING_SOON', 'FINISHED'].includes(oldContract.status)) {
                                await paymentRepository.updateContract(oldContract, { status: 'FINISHED' }, { transaction });
                            }
                        } else {
                            await paymentRepository.updateContract(contract, { status: 'PENDING_CHECK_IN' }, { transaction });

                            if (customer && customer.role === 'CUSTOMER') {
                                await paymentRepository.updateUser(customer, {
                                    role: 'RESIDENT',
                                    building_id: contract.room?.building?.id || contract.room?.building_id
                                }, { transaction });
                            }

                            if (customer?.email) {
                                const customerName = `${customer.last_name || ''} ${customer.first_name || ''}`.trim();
                                welcomeCheckInEmail = {
                                    email: customer.email,
                                    customerName,
                                    contractNumber: contract.contract_number,
                                    contractId: contract.id,
                                    roomNumber: contract.room?.room_number || '',
                                    buildingName: contract.room?.building?.name || '',
                                    startDate: formatDate(contract.start_date),
                                };
                            }
                        }
                    }
                }
            }
        }

        await transaction.commit();

        if (depositPaidBookingId) {
            contractService.createContractFromBooking(depositPaidBookingId)
                .catch(err => console.error('[PaymentService] Failed to create contract:', err));
        }

        if (paymentReceiptEmail) {
            enqueueEmailJobSafely(
                EMAIL_JOB_TYPES.PAYMENT_RECEIVED,
                paymentReceiptEmail,
                'payment receipt email'
            );
        }

        if (welcomeCheckInEmail) {
            enqueueEmailJobSafely(
                EMAIL_JOB_TYPES.WELCOME_CHECK_IN,
                welcomeCheckInEmail,
                'welcome check-in email'
            );
        }

        return true;
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const payosWebhook = async (body) => {
    // Verify webhook signature.
    let webhookData;
    try {
        webhookData = await getPayOS().webhooks.verify(body);
    } catch (err) {
        console.error('[PayOS Webhook] Signature verification failed:', err.message);
        return { success: true }; // Always return 200 to avoid retries.
    }

    const { orderCode, amount, code } = webhookData;
    const isSuccess = code === '00';

    console.log(`[PayOS Webhook] orderCode=${orderCode}, amount=${amount}, code=${code}, success=${isSuccess}`);

    // Find payment by orderCode.
    const payment = await paymentRepository.findPaymentByGatewayTransactionId(orderCode);

    if (!payment) {
        console.error(`[PayOS Webhook] Payment not found for orderCode: ${orderCode}`);
        return { success: true };
    }

    // Validate paid amount (skipped in test mode).
    const { payos } = getRuntimeConfig();
    if (!payos.testAmount && Number(payment.amount) !== amount) {
        console.error(`[PayOS Webhook] Amount mismatch: expected ${payment.amount}, got ${amount}`);
        return { success: true };
    }

    // Idempotency check
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
        console.log(`[PayOS Webhook] Payment ${orderCode} already ${payment.status}, skipping`);
        return { success: true };
    }

    // Mark failed payment.
    if (!isSuccess) {
        await paymentRepository.updatePayment(payment, {
            status: 'FAILED',
            gateway_response: body
        });
        return { success: true };
    }

    // Process successful payment business logic.
    try {
        await processSuccessPayment(payment, body);
        console.log(`[PayOS Webhook] Payment ${orderCode} processed successfully`);
    } catch (err) {
        console.error('[PayOS Webhook] Processing error:', err);
    }

    return { success: true };
};

const getMyPayments = async (userId) => {
    return paymentRepository.findPaymentsByUserId(userId);
};

module.exports = {
    createBookingPaymentUrlPayOS,
    createInvoicePaymentUrlPayOS,
    payosWebhook,
    getMyPayments
};
