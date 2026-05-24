const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
// POST /api/chatbot/chat (public).
router.post('/chat', chatbotController.chat);

module.exports = router;
