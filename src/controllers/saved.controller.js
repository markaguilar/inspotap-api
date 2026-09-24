const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { savedService } = require('../services');

const save = catchAsync(async (req, res) => {
  const result = await savedService.savePhoto(req.user.id, req.params.photoId);
  res.status(httpStatus.OK).send(result);
});

const unsave = catchAsync(async (req, res) => {
  const result = await savedService.unsavePhoto(req.user.id, req.params.photoId);
  res.status(httpStatus.OK).send(result);
});

const listSaved = catchAsync(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await savedService.listSavedPhotos(req.user.id, cursor ?? null, Number(limit) || 20);
  res.status(httpStatus.OK).send(result);
});

const checkSaved = catchAsync(async (req, res) => {
  const saved = await savedService.isPhotoSavedByUser(req.user.id, req.params.photoId);
  res.status(httpStatus.OK).send({ saved });
});

module.exports = {
  save,
  unsave,
  listSaved,
  checkSaved,
};
