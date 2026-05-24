const locationService = require('../services/location.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get paginated locations with filters.
 */
const getAllLocations = asyncHandler(async (req, res) => {
        const { page, limit, search, is_active } = req.query;

        const result = await locationService.getAllLocations({
            page,
            limit,
            search,
            is_active
        });

        return res.status(200).json({
            message: "Lấy danh sách khu vực thành công",
            ...result
        });

});

/**
 * Get location details by ID.
 */
const getLocationById = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const location = await locationService.getLocationById(id);

        return res.status(200).json({
            data: location
        });

});

/**
 * Create a location.
 */
const createLocation = asyncHandler(async (req, res) => {
        const location = await locationService.createLocation(req.body);

        return res.status(201).json({
            message: "Tạo khu vực thành công",
            data: location
        });

});

/**
 * Update a location.
 */
const updateLocation = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updatedLocation = await locationService.updateLocation(id, req.body);

        return res.status(200).json({
            message: "Cập nhật khu vực thành công",
            data: updatedLocation
        });

});

/**
 * Delete a location.
 */
const deleteLocation = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const result = await locationService.deleteLocation(id);

        return res.status(200).json({
            ...result
        });

});

const toggleLocationStatus = asyncHandler(async (req, res) => {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            console.warn('[LocationController] toggleLocationStatus: is_active is not boolean');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const location = await locationService.toggleLocationStatus(req.params.id, is_active)
        return res.status(200).json({
            message: 'Cập nhật trạng thái khu vực thành công',
            data: location
        })

})

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleLocationStatus
};
