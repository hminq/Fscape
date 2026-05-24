const facilityService = require('../services/facility.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getAllFacilities = asyncHandler(async (req, res) => {
        const result = await facilityService.getAllFacilities(req.query, req.user);
        return res.status(200).json({ ...result });

});

const getFacilityById = asyncHandler(async (req, res) => {
        const facility = await facilityService.getFacilityById(req.params.id);
        return res.status(200).json({ data: facility });

});

const createFacility = asyncHandler(async (req, res) => {
        const { name, is_active } = req.body;

        if (!name) {
            throw new AppError('Tên tiện ích là bắt buộc', 400, 'FACILITY_NAME_REQUIRED');
        }

        const facility = await facilityService.createFacility({
            name,
            is_active
        });

        return res.status(201).json({ message: 'Tạo tiện ích thành công', data: facility });

});

const updateFacility = asyncHandler(async (req, res) => {
        const { name, is_active } = req.body;
        let updatedData = { name, is_active };

        const facility = await facilityService.updateFacility(req.params.id, updatedData);

        return res.status(200).json({ message: 'Cập nhật tiện ích thành công', data: facility });

});

const deleteFacility = asyncHandler(async (req, res) => {
        const result = await facilityService.deleteFacility(req.params.id);
        return res.status(200).json({ ...result });

});

module.exports = {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
};
