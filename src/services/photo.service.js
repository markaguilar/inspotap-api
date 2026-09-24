const mongoose = require('mongoose');
const httpStatus = require('http-status');

const { Photo, User, SavedPhoto } = require('../models');

const { cloudinaryService } = require('./cloudinary.service');

const ApiError = require('../utils/ApiError');

/**
 * Creates a photo AND atomically claims one "slot" against the user's plan limit.
 * The atomic findOneAndUpdate prevents a race where two uploads both pass a
 * naive read-then-check on photoCount at the same time.
 */
const createPhoto = async (userId, file, body, planLimit) => {
  if (planLimit !== null) {
    const claimed = await User.findOneAndUpdate(
      { _id: userId, photoCount: { $lt: planLimit } },
      { $inc: { photoCount: 1 } },
      { new: true }
    );
    if (!claimed) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `You've reached your plan's limit of ${planLimit} photos. Upgrade to upload more.`
      );
    }
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { photoCount: 1 } });
  }

  try {
    const result = await cloudinaryService.uploadImageBuffer(file.buffer, `inspotap/${userId}`);

    const photo = await Photo.create({
      user: userId,
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      width: result.width,
      height: result.height,
      caption: body.caption ?? '',
      hotspots: body.hotspots ?? [],
      isPublic: body.isPublic ?? true,
    });

    return photo;
  } catch (err) {
    // roll back the claimed slot if the upload or DB write failed
    await User.findByIdAndUpdate(userId, { $inc: { photoCount: -1 } });
    throw err;
  }
};

const getPhotoById = async (photoId) => {
  const photo = await Photo.findById(photoId);
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');
  return photo;
};

const listMyPhotos = async (userId, cursor, limit = 20) => {
  const query = { user: userId, status: 'active' };
  if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  const photos = await Photo.find(query).sort({ _id: -1 }).limit(limit);
  const nextCursor = photos.length === limit ? photos[photos.length - 1].id : null;
  return { photos, nextCursor };
};

const updatePhoto = async (photoId, userId, updates) => {
  const photo = await Photo.findOne({ _id: photoId, user: userId });
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');

  Object.assign(photo, updates);
  await photo.save();
  return photo;
};

const updateHotspots = async (photoId, userId, hotspots) => {
  const photo = await Photo.findOne({ _id: photoId, user: userId });
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');

  // @ts-expect-error - hotspots is validated by Joi before reaching here
  photo.hotspots = hotspots;
  await photo.save();
  return photo;
};

const deletePhoto = async (photoId, userId) => {
  const photo = await Photo.findOne({ _id: photoId, user: userId });
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');

  await cloudinaryService.deleteImage(photo.cloudinaryPublicId);
  await SavedPhoto.deleteMany({ photo: photo.id }); // cascade: don't leave dangling saves
  await Photo.deleteOne({ _id: photo.id });
  await User.findByIdAndUpdate(userId, { $inc: { photoCount: -1 } });
};

module.exports = { createPhoto, getPhotoById, listMyPhotos, updatePhoto, updateHotspots, deletePhoto };
