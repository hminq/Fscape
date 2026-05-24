const contractService = require('../services/contract.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


// [GET] /api/contracts
const getAllContracts = asyncHandler(async (req, res) => {
        const result = await contractService.getAllContracts(req.query, req.user);
        return res.status(200).json({ ...result });

});

// [GET] /api/contracts/:id
const getContractById = asyncHandler(async (req, res) => {
        const contract = await contractService.getContractById(req.params.id, req.user);
        return res.status(200).json({ data: contract });

});

// [PUT] /api/contracts/:id
const updateContract = asyncHandler(async (req, res) => {
        if (Object.keys(req.body).length === 0) {
            throw new AppError('Dữ liệu gửi lên rỗng', 400, 'EMPTY_REQUEST_BODY');
        }
        const contract = await contractService.updateContract(req.params.id, req.body, req.user);
        return res.status(200).json({
            message: 'Cập nhật hợp đồng thành công',
            data: contract
        });

});

// [GET] /api/contracts/my
const getMyContracts = asyncHandler(async (req, res) => {
        const result = await contractService.getMyContracts(req.user.id, req.query);
        return res.status(200).json(result);

});

// [PATCH] /api/contracts/:id/sign - Customer/Resident signs (authenticated)
const customerSign = asyncHandler(async (req, res) => {
        const { signature_url } = req.body;
        if (!signature_url) {
            console.warn('[ContractController] customerSign: missing signature_url');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const contract = await contractService.customerSign(
            req.params.id, signature_url, req.user, req
        );

        return res.status(200).json({
            message: 'Ký hợp đồng thành công',
            data: contract
        });

});

// [PATCH] /api/contracts/:id/manager-sign - Building Manager signs
const managerSign = asyncHandler(async (req, res) => {
        const { signature_url } = req.body;
        if (!signature_url) {
            console.warn('[ContractController] managerSign: missing signature_url');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const contract = await contractService.managerSign(
            req.params.id, signature_url, req.user, req
        );

        return res.status(200).json({
            message: 'Ký và kích hoạt hợp đồng thành công',
            data: contract
        });

});

// [POST] /api/contracts/:id/renew - Resident renews their contract
const renewContract = asyncHandler(async (req, res) => {
        const contract = await contractService.renewContract(
            req.params.id, req.body, req.user
        );
        return res.status(201).json({
            message: 'Tạo hợp đồng gia hạn thành công',
            data: contract
        });

});

// [GET] /api/contracts/stats
const getContractStats = asyncHandler(async (req, res) => {
        const stats = await contractService.getContractStats(req.user);
        return res.status(200).json({ data: stats });

});

// [POST] /api/contracts/:id/send-reminder - BM/Admin sends manual email reminder
const sendReminder = asyncHandler(async (req, res) => {
        const { reminder_type } = req.body;
        const result = await contractService.sendManualReminder(
            req.params.id, reminder_type, req.user
        );
        return res.status(200).json(result);

});

// [PATCH] /api/contracts/:id/terminate - Admin/BM terminates contract
const terminateContract = asyncHandler(async (req, res) => {
        const result = await contractService.terminateContract(
            req.params.id, req.body, req.user, req
        );

        const message = result.case === 'TERMINATED'
            ? 'Đã chấm dứt hợp đồng thành công'
            : 'Đã tạo yêu cầu checkout - nhân viên sẽ thực hiện checkout để hoàn tất';

        return res.status(200).json({
            message,
            data: {
                contract: result.contract,
                checkout_request: result.checkoutRequest || null
            }
        });

});

module.exports = {
    getAllContracts,
    getContractById,
    getMyContracts,
    updateContract,
    customerSign,
    managerSign,
    renewContract,
    getContractStats,
    sendReminder,
    terminateContract
};
