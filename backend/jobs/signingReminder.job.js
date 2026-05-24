const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { SIGNATURE_EXPIRY_MS } = require('../constants/contract');
const {
    MS_PER_HOUR,
    SIGNING_REMINDER_AFTER_HOURS,
    SIGNING_URGENT_BEFORE_HOURS
} = require('../constants/jobTimeRules');
const { getRuntimeConfig } = require('../config/runtimeConfig');
const { enqueueEmailJob } = require('../services/emailQueue.service');
const { EMAIL_JOB_TYPES } = require('../constants/emailJobs');

const SIGNING_REMINDER_AFTER_MS = SIGNING_REMINDER_AFTER_HOURS * MS_PER_HOUR;
const SIGNING_URGENT_BEFORE_MS = SIGNING_URGENT_BEFORE_HOURS * MS_PER_HOUR;
const BATCH_SIZE = 500;

const buildCursorWhere = (lastContract) => {
    if (!lastContract) return {};

    return {
        [Op.or]: [
            { signature_expires_at: { [Op.gt]: lastContract.signature_expires_at } },
            {
                signature_expires_at: lastContract.signature_expires_at,
                id: { [Op.gt]: lastContract.id }
            }
        ]
    };
};

const run = async () => {
    const { Contract, User, Room, Building } = sequelize.models;
    const nowDate = new Date();
    const now = nowDate.getTime();
    let lastContract = null;

    while (true) {
        const pendingContracts = await Contract.findAll({
            where: {
                status: { [Op.in]: ['PENDING_CUSTOMER_SIGNATURE', 'PENDING_MANAGER_SIGNATURE'] },
                signature_expires_at: { [Op.not]: null, [Op.gt]: nowDate },
                ...buildCursorWhere(lastContract)
            },
            include: [
                { model: User, as: 'customer', attributes: ['id', 'email', 'first_name', 'last_name'] },
                { model: User, as: 'manager', attributes: ['id', 'email', 'first_name', 'last_name'] },
                {
                    model: Room, as: 'room', attributes: ['id', 'room_number'],
                    include: [{ model: Building, as: 'building', attributes: ['id', 'name'] }]
                }
            ],
            order: [
                ['signature_expires_at', 'ASC'],
                ['id', 'ASC']
            ],
            limit: BATCH_SIZE
        });

        if (pendingContracts.length === 0) break;

        for (const contract of pendingContracts) {
            try {
                const expiresAt = new Date(contract.signature_expires_at).getTime();
                const createdAt = expiresAt - SIGNATURE_EXPIRY_MS;
                const elapsed = now - createdAt;
                const remaining = expiresAt - now;

                // Determine recipient based on current signing stage
                const { urls } = getRuntimeConfig();
                let recipientEmail, recipientName, signingUrl;
                if (contract.status === 'PENDING_CUSTOMER_SIGNATURE' && contract.customer) {
                    recipientEmail = contract.customer.email;
                    recipientName = `${contract.customer.last_name} ${contract.customer.first_name}`.trim();
                    signingUrl = `${urls.client}/sign?contractId=${contract.id}`;
                } else if (contract.status === 'PENDING_MANAGER_SIGNATURE' && contract.manager) {
                    recipientEmail = contract.manager.email;
                    recipientName = `${contract.manager.last_name} ${contract.manager.first_name}`.trim();
                    signingUrl = `${urls.admin}/building-manager/contracts?sign=${contract.id}`;
                }

                if (!recipientEmail) continue;

                const roomNumber = contract.room?.room_number || '';
                const buildingName = contract.room?.building?.name || '';
                const emailData = {
                    email: recipientEmail,
                    customerName: recipientName,
                    contractNumber: contract.contract_number,
                    contractId: contract.id,
                    roomNumber,
                    buildingName,
                    signingUrl
                };

                // 6h+ elapsed -> send reminder
                if (elapsed >= SIGNING_REMINDER_AFTER_MS) {
                    const hoursRemaining = Math.floor(remaining / MS_PER_HOUR);
                    await enqueueEmailJob(EMAIL_JOB_TYPES.CONTRACT_SIGNING_REMINDER, {
                        ...emailData,
                        hoursRemaining
                    });
                }

                // <=1h remaining -> send urgent
                if (remaining <= SIGNING_URGENT_BEFORE_MS) {
                    await enqueueEmailJob(EMAIL_JOB_TYPES.CONTRACT_SIGNING_URGENT, emailData);
                }
            } catch (err) {
                console.error(`[SigningReminderJob] Failed for contract ${contract.id}:`, err.message);
            }
        }

        lastContract = pendingContracts[pendingContracts.length - 1];
    }
};

module.exports = { run };
