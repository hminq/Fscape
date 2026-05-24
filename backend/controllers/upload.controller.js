const uploadService = require('../services/upload.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const uploadFiles = asyncHandler(async (req, res) => {
    const { type } = req.query;

    if (!type) {
      console.warn('[UploadController] uploadFiles: missing type query parameter');
      throw new AppError('Dữ liệu không hợp lệ', 400, 'INVALID_UPLOAD_TYPE');
    }

    const urls = await uploadService.uploadFiles(req, type);

    return res.status(200).json({ urls });

});

module.exports = { uploadFiles };
