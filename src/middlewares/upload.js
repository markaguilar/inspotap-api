const multer = require('multer');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage(); // never write to disk — stream straight to Cloudinary

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    // multer's callback type only accepts Error (or null); ApiError extends Error so this
    // still carries through to the Express error handler, which reads statusCode off it.
    return cb(new ApiError(httpStatus.BAD_REQUEST, 'Only image files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter,
});

const uploadSingleImage = upload.single('image');
const uploadPaymentProof = upload.single('proofImage');

module.exports = { upload, uploadSingleImage, uploadPaymentProof };
