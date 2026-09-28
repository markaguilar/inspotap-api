const httpStatus = require('http-status');
const { User, Photo } = require('../models');
const ApiError = require('../utils/ApiError');
const { attachSavedFlags } = require('./saved.service');

const getMyProfile = async (userId) => {
  const user = await User.findById(userId).populate('plan').select('-password');
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  return user;
};

const updateMyProfile = async (userId, updates) => {
  if (updates.username) {
    const taken = await User.findOne({ username: updates.username, _id: { $ne: userId } });
    if (taken) throw new ApiError(httpStatus.CONFLICT, 'Username is already taken');
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  return user;
};

const getPublicProfile = async (username, viewerId) => {
  const user = await User.findOne({ username })
    .select('username bio avatarUrl plan createdAt')
    .populate('plan', 'displayName key');
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const photos = await Photo.find({ user: user.id, isPublic: true, status: 'active' })
    .sort({ createdAt: -1 })
    .select('imageUrl width height hotspots caption saveCount createdAt');

  const photosWithSavedFlag = await attachSavedFlags(viewerId, photos);
  return { user, photos: photosWithSavedFlag };
};

module.exports = { getMyProfile, updateMyProfile, getPublicProfile };
