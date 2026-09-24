const httpStatus = require('http-status');

const catchAsync = require('../utils/catchAsync');

const { profileService } = require('../services');

const getMe = catchAsync(async (req, res) => {
  const user = await profileService.getMyProfile(req.user.id);
  res.status(httpStatus.OK).send(user);
});

const updateMe = catchAsync(async (req, res) => {
  const user = await profileService.updateMyProfile(req.user.id, req.body);
  res.status(httpStatus.OK).send(user);
});

const getPublicProfile = catchAsync(async (req, res) => {
  const viewerId = req.user?.id ?? null;
  const result = await profileService.getPublicProfile(req.params.username, viewerId);
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  getMe,
  updateMe,
  getPublicProfile,
};
