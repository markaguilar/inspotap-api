const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');

const { Collection, SavedPhoto, Photo } = require('../models');

const createCollection = async (userId, data) => {
  return Collection.create({ user: userId, name: data.name, isPublic: data.isPublic ?? false });
};

const listMyCollections = async (userId) => {
  return Collection.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

const addPhotoToCollection = async (collectionId, userId, photoId) => {
  const collection = await Collection.findOne({ _id: collectionId, user: userId });
  if (!collection) throw new ApiError(httpStatus.NOT_FOUND, 'Collection not found');

  const photo = await Photo.findOne({ _id: photoId, status: 'active' });
  if (!photo) throw new ApiError(httpStatus.NOT_FOUND, 'Photo not found');

  const result = await SavedPhoto.findOneAndUpdate(
    { board: collectionId, photo: photoId },
    { $setOnInsert: { savedBy: userId, board: collectionId, photo: photoId } },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (result.lastErrorObject?.upserted) {
    await Photo.findByIdAndUpdate(photoId, { $inc: { saveCount: 1 } });
  }
  return { added: true };
};

const removePhotoFromCollection = async (collectionId, userId, photoId) => {
  const collection = await Collection.findOne({ _id: collectionId, user: userId });
  if (!collection) throw new ApiError(httpStatus.NOT_FOUND, 'Collection not found');

  const deleted = await SavedPhoto.findOneAndDelete({ board: collectionId, photo: photoId });
  if (deleted) {
    await Photo.findByIdAndUpdate(photoId, { $inc: { saveCount: -1 } });
  }
  return { removed: true };
};

/**
 * Ensures a user has their default "Saved" collection, creating it if some
 * legacy account predates the on-signup default-collection logic.
 */
const getOrCreateDefaultCollectionId = async (userId) => {
  const existing = await Collection.findOne({ user: userId, isDefault: true });
  if (existing) return existing.id;

  const created = await Collection.create({ user: userId, name: 'Saved', isDefault: true });
  return created.id;
};

module.exports = {
  createCollection,
  listMyCollections,
  addPhotoToCollection,
  removePhotoFromCollection,
  getOrCreateDefaultCollectionId,
};
