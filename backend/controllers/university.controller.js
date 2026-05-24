const universityService = require('../services/university.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getAllUniversities = asyncHandler(async (req, res) => {
        const result = await universityService.getAllUniversities(req.query);
        return res.status(200).json({ ...result });

});

const getUniversityById = asyncHandler(async (req, res) => {
        const university = await universityService.getUniversityById(req.params.id);
        return res.status(200).json({ data: university });

});

const createUniversity = asyncHandler(async (req, res) => {
        const { name, location_id } = req.body;
        if (!name || !location_id) {
            console.warn('[UniversityController] createUniversity: missing name or location_id');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }
        const university = await universityService.createUniversity(req.body);
        return res.status(201).json({ data: university });

});

const updateUniversity = asyncHandler(async (req, res) => {
        const university = await universityService.updateUniversity(req.params.id, req.body);
        return res.status(200).json({ data: university });

});

const deleteUniversity = asyncHandler(async (req, res) => {
        const result = await universityService.deleteUniversity(req.params.id);
        return res.status(200).json({ ...result });

});

const toggleUniversityStatus = asyncHandler(async (req, res) => {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            console.warn('[UniversityController] toggleUniversityStatus: is_active is not boolean');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const university = await universityService.toggleUniversityStatus(req.params.id, is_active)
        return res.status(200).json({
            message: 'Cập nhật trạng thái trường đại học thành công',
            data: university
        })

})

module.exports = {
    getAllUniversities,
    getUniversityById,
    createUniversity,
    updateUniversity,
    deleteUniversity,
    toggleUniversityStatus
};
