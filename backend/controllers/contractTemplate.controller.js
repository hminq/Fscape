const templateService = require('../services/contractTemplate.service');
const asyncHandler = require('../utils/asyncHandler');


const getAllTemplates = asyncHandler(async (req, res) => {
        const result = await templateService.getAllTemplates(req.query);
        return res.status(200).json(result);

});

const getTemplateById = asyncHandler(async (req, res) => {
        const template = await templateService.getTemplateById(req.params.id);
        return res.status(200).json({ data: template });

});

const createTemplate = asyncHandler(async (req, res) => {
        const template = await templateService.createTemplate(req.body, req.user.id);
        return res.status(201).json({ message: 'Tạo mẫu hợp đồng thành công', data: template });

});

const updateTemplate = asyncHandler(async (req, res) => {
        const template = await templateService.updateTemplate(req.params.id, req.body);
        return res.status(200).json({ message: 'Cập nhật mẫu hợp đồng thành công', data: template });

});

const deleteTemplate = asyncHandler(async (req, res) => {
        const result = await templateService.deleteTemplate(req.params.id);
        return res.status(200).json(result);

});

module.exports = { getAllTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate };
