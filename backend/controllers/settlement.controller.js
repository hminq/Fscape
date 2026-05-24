const settlementService = require('../services/settlement.service');
const asyncHandler = require('../utils/asyncHandler');


const getAllSettlements = asyncHandler(async (req, res) => {
        const result = await settlementService.getAllSettlements(req.query, req.user);
        return res.status(200).json(result);

});

const getSettlement = asyncHandler(async (req, res) => {
        const result = await settlementService.getSettlement(req.params.id, req.user);
        return res.status(200).json({ data: result });

});

const getSettlementByContract = asyncHandler(async (req, res) => {
        const result = await settlementService.getSettlementByContract(req.params.contract_id, req.user);
        return res.status(200).json({ data: result });

});

const closeSettlement = asyncHandler(async (req, res) => {
        const result = await settlementService.closeSettlement(req.params.id, req.user);
        return res.status(200).json({ message: 'Đã đóng quyết toán', data: result });

});

module.exports = { getAllSettlements, getSettlement, getSettlementByContract, closeSettlement };
