import multer from 'multer';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

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

export const uploadSingleImage = upload.single('image');
export const uploadPaymentProof = upload.single('proofImage');

module.exports = { upload, uploadSingleImage, uploadPaymentProof };
