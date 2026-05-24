const chatbotService = require('../services/chatbot.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/chatbot/chat
 * Body: { message: string, history?: Array }
 */
const chat = asyncHandler(async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new AppError('Tin nhắn không được để trống.', 400, 'INVALID_MESSAGE');
    }

    if (message.trim().length > 1000) {
      throw new AppError('Tin nhắn quá dài (tối đa 1000 ký tự).', 400, 'MESSAGE_TOO_LONG');
    }

    const reply = await chatbotService.chat(message.trim(), history);

    return res.json({
      reply,
      timestamp: new Date().toISOString(),
    });

});

module.exports = { chat };
