const roomService = require('../services/room.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getAllRooms = asyncHandler(async (req, res) => {
        const result = await roomService.getAllRooms(req.query, req.user);
        return res.status(200).json({ ...result });

});

const getRoomFacets = asyncHandler(async (req, res) => {
        const result = await roomService.getRoomFacets(req.query, req.user);
        return res.status(200).json({ ...result });

});

const getRoomById = asyncHandler(async (req, res) => {
        const room = await roomService.getRoomById(req.params.id, req.user);
        return res.status(200).json({ data: room });

});

const createRoom = asyncHandler(async (req, res) => {
        const roomData = { ...req.body };

        if (!roomData.room_number || !roomData.building_id || !roomData.room_type_id || roomData.floor === undefined) {
            console.warn('[RoomController] createRoom: missing required fields');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const room = await roomService.createRoom(roomData);

        return res.status(201).json({
            message: 'Tạo phòng thành công',
            data: room
        });


});

const createBatchRooms = asyncHandler(async (req, res) => {
        const {
            building_id, room_type_id, floor, count,
            thumbnail_url, image_3d_url, blueprint_url, gallery_images
        } = req.body;

        if (!building_id || !room_type_id || floor === undefined || !count) {
            console.warn('[RoomController] createBatchRooms: missing required fields');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const parsedCount = Number(count);
        if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 50) {
            console.warn('[RoomController] createBatchRooms: count out of range:', parsedCount);
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const result = await roomService.createBatchRooms({
            building_id,
            room_type_id,
            floor: Number(floor),
            count: parsedCount,
            thumbnail_url: thumbnail_url || null,
            image_3d_url: image_3d_url || null,
            blueprint_url: blueprint_url || null,
            gallery_images: gallery_images || [],
        });

        return res.status(201).json({
            message: `Đã tạo thành công ${result.count} phòng`,
            data: result
        });

});

const updateRoom = asyncHandler(async (req, res) => {
        const updateData = { ...req.body };
        const room = await roomService.updateRoom(req.params.id, updateData);

        return res.status(200).json({
            message: 'Cập nhật phòng thành công',
            data: room
        });


});

const deleteRoom = asyncHandler(async (req, res) => {
        const result = await roomService.deleteRoom(req.params.id);
        return res.status(200).json({ ...result });

});

const toggleRoomStatus = asyncHandler(async (req, res) => {
        const { status } = req.body;

        if (!status) {
            console.warn('[RoomController] toggleRoomStatus: missing status');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const room = await roomService.toggleRoomStatus(req.params.id, status, req.user);
        return res.status(200).json({
            message: `Đã cập nhật trạng thái phòng thành ${status}`,
            data: room
        });

});

const getRoomsByBuilding = asyncHandler(async (req, res) => {
    const { building_id } = req.params;

    const rooms = await roomService.getRoomsByBuilding(
      building_id,
      req.query,
      req.user
    );

    res.json({
      success: true,
      data: rooms
    });
});
const getMyRooms = asyncHandler(async (req, res) => {
        const data = await roomService.getMyRooms(req.user.id);
        return res.status(200).json({ data });

});

const getRoomStats = asyncHandler(async (req, res) => {
        const stats = await roomService.getRoomStats(req.user);
        return res.status(200).json({ data: stats });

});

module.exports = {
    getAllRooms,
    getRoomFacets,
    getRoomById,
    createRoom,
    createBatchRooms,
    updateRoom,
    deleteRoom,
    toggleRoomStatus,
    getRoomsByBuilding,
    getMyRooms,
    getRoomStats
};
