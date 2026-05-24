const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getRuntimeConfig } = require('./runtimeConfig');

const { gemini } = getRuntimeConfig();
const genAI = new GoogleGenerativeAI(gemini.apiKey);

const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
const chatModel = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

module.exports = { genAI, embeddingModel, chatModel };
