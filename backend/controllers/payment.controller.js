const { sequelize } = require("../config/db");
const paymentService = require("../services/payment.service");
const { getRuntimeConfig } = require("../config/runtimeConfig");
const asyncHandler = require('../utils/asyncHandler');

const getMyPayments = asyncHandler(async (req, res) => {
    const { Payment, Booking, Room, Building } = sequelize.models;
    const userId = req.user.id;

    const payments = await Payment.findAll({
        where: { user_id: userId },
        include: [
            {
                model: Booking,
                as: 'booking',
                include: [
                    {
                        model: Room,
                        as: 'room',
                        include: [{ model: Building, as: 'building' }]
                    }
                ]
            }
        ],
        order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
        data: payments
    });
});

// PayOS handlers.

const createBookingPaymentUrlPayOS = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { booking_id } = req.body;
        const result = await paymentService.createBookingPaymentUrlPayOS(userId, booking_id);
        return res.status(200).json(result);

});

const createInvoicePaymentUrlPayOS = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { invoice_id } = req.body;
        const result = await paymentService.createInvoicePaymentUrlPayOS(userId, invoice_id);
        return res.status(200).json(result);

});

const payosWebhook = async (req, res) => {
    try {
        console.log(`[PayOS Webhook] ${new Date().toISOString()} from ${req.ip}`);
        console.log('[PayOS Webhook] Body:', JSON.stringify(req.body));
        const result = await paymentService.payosWebhook(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error('[PayOS Webhook] Error:', error.message, error.stack);
        return res.status(200).json({ success: true });
    }
};

const payosReturn = async (req, res) => {
    const { urls } = getRuntimeConfig();
    const clientUrl = urls.client;
    const { code, id, cancel, status, orderCode } = req.query;
    return res.redirect(
        `${clientUrl}/payment/result?code=${code}&id=${id || ''}&cancel=${cancel || 'false'}&status=${status || ''}&orderCode=${orderCode || ''}`
    );
};

module.exports = {
    createBookingPaymentUrlPayOS,
    createInvoicePaymentUrlPayOS,
    payosWebhook,
    payosReturn,
    getMyPayments
};
