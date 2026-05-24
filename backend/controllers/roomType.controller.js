const roomTypeService = require('../services/roomType.service')
const asyncHandler = require('../utils/asyncHandler');

const getAllRoomTypes = asyncHandler(async (req, res) => {
        const result = await roomTypeService.getAllRoomTypes(req.query, req.user)
        return res.status(200).json({ ...result })

})

const getRoomTypeById = asyncHandler(async (req, res) => {
        const data = await roomTypeService.getRoomTypeById(req.params.id, req.user)
        return res.status(200).json({ data })

})

const createRoomType = asyncHandler(async (req, res) => {
        const data = await roomTypeService.createRoomType(req.body)
        return res.status(201).json({
            message: 'Tạo loại phòng thành công',
            data
        })

})

const updateRoomType = asyncHandler(async (req, res) => {
        const data = await roomTypeService.updateRoomType(req.params.id, req.body)
        return res.status(200).json({
            message: 'Cập nhật loại phòng thành công',
            data
        })

})

const deleteRoomType = asyncHandler(async (req, res) => {
        const result = await roomTypeService.deleteRoomType(req.params.id)
        return res.status(200).json({ ...result })

})

const getTemplateAssets = asyncHandler(async (req, res) => {
        const data = await roomTypeService.getTemplateAssets(req.params.id)
        return res.status(200).json({ data })

})

const replaceTemplateAssets = asyncHandler(async (req, res) => {
        const data = await roomTypeService.replaceTemplateAssets(req.params.id, req.body)
        return res.status(200).json({ message: 'Cập nhật định mức tài sản thành công', data })

})

const getRoomTypeStats = asyncHandler(async (req, res) => {
        const stats = await roomTypeService.getRoomTypeStats()
        return res.status(200).json({ data: stats })

})

module.exports = {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    getTemplateAssets,
    replaceTemplateAssets,
    getRoomTypeStats
}
