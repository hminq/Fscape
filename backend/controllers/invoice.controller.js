const invoiceService = require('../services/invoice.service');
const asyncHandler = require('../utils/asyncHandler');


const triggerInvoiceJob = asyncHandler(async (req, res) => {
        const count = await invoiceService.generatePeriodicInvoices();
        return res.status(200).json({ message: `Đã sinh thành công ${count} hóa đơn.` });

});

const getAllInvoices = asyncHandler(async (req, res) => {
        const result = await invoiceService.getAllInvoices(req.user, req.query);
        return res.status(200).json({ ...result });

});

const getInvoiceStats = asyncHandler(async (req, res) => {
        const stats = await invoiceService.getInvoiceStats(req.user);
        return res.status(200).json({ data: stats });

});

const getMyInvoices = asyncHandler(async (req, res) => {
        const result = await invoiceService.getMyInvoices(req.user.id, req.query);
        return res.status(200).json(result);

});

const getInvoiceById = asyncHandler(async (req, res) => {
        const invoice = await invoiceService.getInvoiceById(req.user, req.params.id);
        return res.status(200).json({ data: invoice });

});

module.exports = {
    triggerInvoiceJob,
    getAllInvoices,
    getInvoiceStats,
    getMyInvoices,
    getInvoiceById
};
