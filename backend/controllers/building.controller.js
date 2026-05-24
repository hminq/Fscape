const buildingService = require('../services/building.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


// GET /api/buildings
const getAllBuildings = asyncHandler(async (req, res) => {
        const result = await buildingService.getAllBuildings(req.query, req.user);
        return res.status(200).json({ ...result });

});

// GET /api/buildings/:id
const getBuildingById = asyncHandler(async (req, res) => {
        const building = await buildingService.getBuildingById(req.params.id, req.user);
        return res.status(200).json({ data: building });

});

// POST /api/buildings
const createBuilding = asyncHandler(async (req, res) => {
        const {
            location_id,
            name,
            address,
            latitude,
            longitude,
            description,
            total_floors,
            thumbnail_url,
            is_active,
            images,
            facilities,
            manager_id
        } = req.body;

        // Normalize facilities to array format.
        let parsedFacilities = [];
        if (facilities) {
            if (Array.isArray(facilities)) {
                parsedFacilities = facilities;
            } else if (typeof facilities === 'string') {
                parsedFacilities = [facilities];
            }
        }

        const building = await buildingService.createBuilding({
            location_id,
            name,
            address,
            latitude,
            longitude,
            description,
            total_floors,
            thumbnail_url: thumbnail_url || null,
            is_active,
            images: images || [],
            facilities: parsedFacilities,
            manager_id: manager_id || null
        });

        return res.status(201).json({
            message: 'Tạo tòa nhà thành công',
            data: building
        });


});

// PUT /api/buildings/:id
const updateBuilding = asyncHandler(async (req, res) => {
        const updateData = { ...req.body };

        // Normalize facilities to array format.
        if (updateData.facilities) {
            if (!Array.isArray(updateData.facilities)) {
                updateData.facilities = [updateData.facilities];
            }
        }

        const building = await buildingService.updateBuilding(req.params.id, updateData);

        return res.status(200).json({
            message: 'Cập nhật tòa nhà thành công',
            data: building
        });


});
// DELETE /api/buildings/:id
const deleteBuilding = asyncHandler(async (req, res) => {
        const result = await buildingService.deleteBuilding(req.params.id);

        return res.status(200).json({
            message: 'Xóa tòa nhà thành công',
            ...result
        });


});

// PATCH /api/buildings/:id/status
const toggleBuildingStatus = asyncHandler(async (req, res) => {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            console.warn('[BuildingController] toggleBuildingStatus: is_active is not boolean');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const building = await buildingService.toggleBuildingStatus(req.params.id, is_active, req.user)
        return res.status(200).json({
            message: 'Cập nhật trạng thái tòa nhà thành công',
            data: building
        })

})

const getStaffsInBuilding = asyncHandler(async (req, res) => {
    const { building_id } = req.params;

    const staffs = await buildingService.getStaffsByBuilding(building_id);

    return res.json(staffs);

});
// GET /api/buildings/stats
const getBuildingStats = asyncHandler(async (req, res) => {
        const stats = await buildingService.getBuildingStats();
        return res.status(200).json({ data: stats });

});

module.exports = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingStatus,
    getStaffsInBuilding,
    getBuildingStats
};
