const mongoose = require('mongoose');

const { Photo } = require('../models');

const { attachSavedFlags } = require('./saved.service');

// eslint-disable-next-line import/prefer-default-export
const getFeed = async (viewerId, cursor, limit = 20) => {
  const query = { isPublic: true, status: 'active' };
  if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  const photos = await Photo.find(query).sort({ _id: -1 }).limit(limit).populate('user', 'username avatarUrl');

  const nextCursor = photos.length === limit ? photos[photos.length - 1].id : null;
  const photosWithSavedFlag = await attachSavedFlags(viewerId, photos);

  return { photos: photosWithSavedFlag, nextCursor };
};

module.exports = { getFeed };
