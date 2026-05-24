const notificationService = require('../services/notification.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');


const getMyNotifications = asyncHandler(async (req, res) => {
        const result = await notificationService.getUserNotifications(req.user.id, req.query);
        return res.status(200).json({ ...result });

});

const getUnreadCount = asyncHandler(async (req, res) => {
        const count = await notificationService.getUnreadCount(req.user.id);
        return res.status(200).json({ count });

});

const markAsRead = asyncHandler(async (req, res) => {
        const recipient = await notificationService.markAsRead(req.params.id, req.user.id);
        if (!recipient) {
            throw new AppError('Không tìm thấy thông báo', 404, 'NOTIFICATION_NOT_FOUND');
        }
        return res.status(200).json({ message: 'Đã đánh dấu thông báo là đã đọc', data: recipient });

});

const markAllAsRead = asyncHandler(async (req, res) => {
        await notificationService.markAllAsRead(req.user.id);
        return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });

});

const createBmNotification = asyncHandler(async (req, res) => {
        const { title, content, target, room_id } = req.body;

        if (!title || !content || !target) {
            console.warn('[NotificationController] createBmNotification: missing required fields');
            throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_INPUT');
        }

        const result = await notificationService.createBmNotification(req.user, { title, content, target, room_id });

        return res.status(201).json({
            message: `Đã gửi thông báo đến ${result.recipient_count} cư dân`,
            data: result.notification
        });

});

const getAllNotifications = asyncHandler(async (req, res) => {
        const result = await notificationService.getAllNotifications(req.query);
        return res.status(200).json({ ...result });

});

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createBmNotification,
    getAllNotifications
};
