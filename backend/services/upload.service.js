const path = require('path');
const Busboy = require('busboy');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('../config/s3');
const { UPLOAD_CATEGORIES } = require('../constants/upload');
const AppError = require('../utils/AppError');

/**
 * MIME type to file extension mapping for image uploads.
 */
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'application/pdf': '.pdf',
};

/**
 * Parse multipart files from request, validate against category config,
 * upload to S3, and return an array of S3 key strings.
 */
async function uploadFiles(req, categoryKey) {
  const config = UPLOAD_CATEGORIES[categoryKey];
  if (!config) {
    throw new AppError('Loại tệp không hợp lệ', 400, 'INVALID_UPLOAD_TYPE');
  }

  const files = await parseMultipart(req, config);

  if (files.length === 0) {
    throw new AppError('Không có file nào được gửi lên', 400, 'NO_FILE_UPLOADED');
  }

  const resourceType = config.resourceType || 'image';

  const uploads = files.map((file) => {
    const ext = resolveExtension(file, resourceType);
    return uploadToS3(file.buffer, {
      folder: config.folder,
      contentType: file.mimeType,
      extension: ext,
    });
  });

  return Promise.all(uploads);
}

/**
 * Resolve file extension.
 * - For raw uploads (3D models, PDFs): preserve original filename extension.
 * - For image uploads: derive from MIME type for consistency.
 */
function resolveExtension(file, resourceType) {
  if (resourceType === 'raw' && file.filename) {
    return path.extname(file.filename).toLowerCase();
  }
  return MIME_TO_EXT[file.mimeType] || '';
}

/**
 * Use busboy to parse multipart form data into in-memory buffers.
 * Validates file count, individual file size, and MIME type.
 */
function parseMultipart(req, config) {
  return new Promise((resolve, reject) => {
    const files = [];
    let finished = false;

    const fail = (msg) => {
      if (finished) return;
      finished = true;
      reject(new AppError(msg, 400, 'INVALID_UPLOAD_FILE'));
    };

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: config.maxFiles,
        fileSize: config.maxSize,
      },
    });

    busboy.on('file', (fieldname, stream, info) => {
      const { mimeType, filename } = info;

      if (!config.mimePattern.test(mimeType)) {
        stream.resume(); // drain the stream
        return fail('Định dạng file không được hỗ trợ');
      }

      const chunks = [];
      let size = 0;

      stream.on('data', (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on('limit', () => {
        const maxMB = (config.maxSize / (1024 * 1024)).toFixed(0);
        fail(`File vượt quá dung lượng tối đa ${maxMB}MB`);
      });

      stream.on('end', () => {
        if (!finished) {
          files.push({ buffer: Buffer.concat(chunks), mimeType, filename });
        }
      });
    });

    busboy.on('filesLimit', () => {
      fail(`Số lượng file vượt quá giới hạn ${config.maxFiles}`);
    });

    busboy.on('finish', () => {
      if (!finished) {
        finished = true;
        resolve(files);
      }
    });

    busboy.on('error', (err) => {
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    req.pipe(busboy);
  });
}

/**
 * Upload a buffer to S3 and return the object key.
 *
 * @param {Buffer} buffer - File content
 * @param {object} opts
 * @param {string} opts.folder - S3 key prefix (e.g. 'rooms/gallery')
 * @param {string} opts.contentType - MIME type for Content-Type header
 * @param {string} opts.extension - File extension including dot (e.g. '.jpg')
 * @returns {Promise<string>} S3 object key (e.g. 'rooms/gallery/1712345678_a1b2c3.jpg')
 */
async function uploadToS3(buffer, { folder, contentType, extension = '' }) {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = `${folder}/${uniqueId}${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Upload a raw buffer to S3 for a given category.
 * Used for server-side uploads (e.g. PDF generation) where there is no HTTP request.
 *
 * @param {Buffer} buffer - File content
 * @param {string} categoryKey - Key from UPLOAD_CATEGORIES (e.g. 'contract_pdf')
 * @param {string} filename - Original filename (used for extension)
 * @returns {Promise<string>} S3 object key
 */
async function uploadBuffer(buffer, categoryKey, filename) {
  const config = UPLOAD_CATEGORIES[categoryKey];
  if (!config) {
    throw new AppError('Loại tệp không hợp lệ', 400, 'INVALID_UPLOAD_TYPE');
  }

  const resourceType = config.resourceType || 'image';
  const ext = resolveExtension({ filename, mimeType: 'application/octet-stream' }, resourceType);

  return uploadToS3(buffer, {
    folder: config.folder,
    contentType: resourceType === 'raw' ? 'application/octet-stream' : 'application/pdf',
    extension: ext,
  });
}

module.exports = { uploadFiles, uploadBuffer };
