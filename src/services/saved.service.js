const mongoose = require('mongoose');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const { getOrCreateDefaultCollectionId } = require('./collection.service');

const { SavedPhoto, Photo } = require('../models');

/**
 * Quick "save" action — saves straight into the user's default Saved board.
 * Idempotent: double-tapping save is a no-op, not an error.
 */
const savePhoto = async (userId, photoId) => {
  const photo = await Photo.findOne({ _id: photoId, status: 'active' });
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');

  const boardId = await getOrCreateDefaultCollectionId(userId);

  const result = await SavedPhoto.findOneAndUpdate(
    { board: boardId, photo: photoId },
    { $setOnInsert: { savedBy: userId, board: boardId, photo: photoId } },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (result.lastErrorObject?.upserted) {
    await Photo.findByIdAndUpdate(photoId, { $inc: { saveCount: 1 } });
  }
  return { saved: true };
};

const unsavePhoto = async (userId, photoId) => {
  const boardId = await getOrCreateDefaultCollectionId(userId);
  const deleted = await SavedPhoto.findOneAndDelete({ board: boardId, photo: photoId, savedBy: userId });
  if (deleted) {
    await Photo.findByIdAndUpdate(photoId, { $inc: { saveCount: -1 } });
  }
  return { saved: false };
};

const isPhotoSavedByUser = async (userId, photoId) => {
  const boardId = await getOrCreateDefaultCollectionId(userId);
  const exists = await SavedPhoto.exists({ board: boardId, photo: photoId });
  return Boolean(exists);
};

/** The Saved page itself — cursor-paginated, newest-saved first. */
const listSavedPhotos = async (userId, cursor, limit = 20) => {
  const boardId = await getOrCreateDefaultCollectionId(userId);

  const query = { board: boardId };
  if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  const saved = (await SavedPhoto.find(query).sort({ _id: -1 }).limit(limit).populate)({
    path: 'photo',
    select: 'imageUrl width height hotspots caption saveCount user',
    populate: { path: 'user', select: 'username avatarUrl' },
  });

  // a saved photo may have been deleted since being saved — drop those rows
  const items = saved
    .filter((s) => s.photo)
    .map((s) => ({ savedPhotoId: s.id, savedAt: s.get('createdAt'), photo: s.photo }));

  const nextCursor = saved.length === limit ? saved[saved.length - 1].id : null;
  return { photos: items, nextCursor };
};

/**
 * Batch-checks saved status for a page of photos in ONE query, so feed/profile
 * responses can include `isSaved` per card without an N+1 query per photo.
 */
const attachSavedFlags = async (userId, photos) => {
  if (!userId || photos.length === 0) {
    return photos.map((p) => ({ ...p.toObject(), isSaved: false }));
  }

  const boardId = await getOrCreateDefaultCollectionId(userId);
  const photoIds = photos.map((p) => p.id);
  const savedRows = await SavedPhoto.find({ board: boardId, photo: { $in: photoIds } }).select('photo');
  const savedSet = new Set(savedRows.map((r) => r.photo.toString()));

  return photos.map((p) => ({ ...p.toObject(), isSaved: savedSet.has(p.id) }));
};

module.exports = { savePhoto, unsavePhoto, isPhotoSavedByUser, listSavedPhotos, attachSavedFlags };
