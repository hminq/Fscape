const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { FIRST_RENT_REMINDER_DAYS_BEFORE_DUE } = require('../constants/jobTimeRules');
const { enqueueEmailJob } = require('../services/emailQueue.service');
const { EMAIL_JOB_TYPES } = require('../constants/emailJobs');

const BATCH_SIZE = 500;

const buildCursorWhere = (lastInvoice) => {
    if (!lastInvoice) return {};

    return {
        [Op.or]: [
            { createdAt: { [Op.gt]: lastInvoice.createdAt } },
            {
                createdAt: lastInvoice.createdAt,
                id: { [Op.gt]: lastInvoice.id }
            }
        ]
    };
};

const buildEmailPayload = (invoice, dueDate) => {
    const customer = invoice.contract.customer;

    return {
        email: customer.email,
        customerName: `${customer.last_name} ${customer.first_name}`.trim(),
        invoiceNumber: invoice.invoice_number,
        invoiceId: invoice.id,
        roomNumber: invoice.contract.room?.room_number || '',
        buildingName: invoice.contract.room?.building?.name || '',
        totalAmount: invoice.total_amount?.toLocaleString('vi-VN') + ' VNĐ',
        dueDate
    };
};

const enqueueFirstRentReminderBatch = async ({
    Invoice,
    invoiceIncludes,
    dueDate,
    jobType,
    logLabel
}) => {
    let totalFound = 0;
    let lastInvoice = null;

    while (true) {
        const invoices = await Invoice.findAll({
            where: {
                invoice_type: 'RENT',
                status: 'UNPAID',
                due_date: dueDate,
                ...buildCursorWhere(lastInvoice)
            },
            include: invoiceIncludes,
            order: [
                ['createdAt', 'ASC'],
                ['id', 'ASC']
            ],
            limit: BATCH_SIZE
        });

        if (invoices.length === 0) break;

        totalFound += invoices.length;

        for (const invoice of invoices) {
            try {
                if (String(invoice.billing_period_start) !== String(invoice.contract.start_date)) continue;
                const customer = invoice.contract.customer;
                if (!customer) continue;

                await enqueueEmailJob(jobType, buildEmailPayload(invoice, dueDate));
            } catch (err) {
                console.error(`[FirstRentReminderJob] ${logLabel} failed for invoice ${invoice.id}:`, err.message);
            }
        }

        lastInvoice = invoices[invoices.length - 1];
    }

    return totalFound;
};

const run = async () => {
    const { Invoice, Contract, User, Room, Building } = sequelize.models;

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00Z');
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + FIRST_RENT_REMINDER_DAYS_BEFORE_DUE);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const invoiceIncludes = [{
        model: Contract,
        as: 'contract',
        where: { status: 'PENDING_FIRST_PAYMENT' },
        required: true,
        include: [
            { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
            {
                model: Room, as: 'room', attributes: ['id', 'room_number'],
                include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
            }
        ]
    }];

    // Phase 1: 1-day-before reminder (due tomorrow)
    const tomorrowCount = await enqueueFirstRentReminderBatch({
        Invoice,
        invoiceIncludes,
        dueDate: tomorrowStr,
        jobType: EMAIL_JOB_TYPES.FIRST_RENT_REMINDER,
        logLabel: 'Reminder'
    });

    console.log(`[FirstRentReminderJob] Found ${tomorrowCount} invoice(s) due tomorrow (${tomorrowStr})`);

    // Phase 2: Due-date morning urgent (due today)
    const todayCount = await enqueueFirstRentReminderBatch({
        Invoice,
        invoiceIncludes,
        dueDate: todayStr,
        jobType: EMAIL_JOB_TYPES.FIRST_RENT_URGENT,
        logLabel: 'Urgent'
    });

    console.log(`[FirstRentReminderJob] Found ${todayCount} invoice(s) due today (${todayStr})`);
};

module.exports = { run };
