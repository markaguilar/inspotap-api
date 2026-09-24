const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const { photoService } = require('../services');

const create = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Image file is required');
  // req.userPlanLimit is attached by the checkPhotoLimit middleware, which already
  // read the user's current plan — reused here to avoid a second DB round trip.
  const photo = await photoService.createPhoto(req.user.id, req.file, req.body, req.userPlanLimit ?? null);
  res.status(httpStatus.CREATED).send(photo);
});

const listMine = catchAsync(async (req, res) => {
  const { cursor, limit } = req.query;
  const result = await photoService.listMyPhotos(req.user.id, cursor ?? null, Number(limit) || 20);
  res.status(httpStatus.OK).send(result);
});

const getOne = catchAsync(async (req, res) => {
  const photo = await photoService.getPhotoById(req.params.photoId);
  res.status(httpStatus.OK).send(photo);
});

const update = catchAsync(async (req, res) => {
  const photo = await photoService.updatePhoto(req.params.photoId, req.user.id, req.body);
  res.status(httpStatus.OK).send(photo);
});

const updateHotspots = catchAsync(async (req, res) => {
  const photo = await photoService.updateHotspots(req.params.photoId, req.user.id, req.body.hotspots);
  res.status(httpStatus.OK).send(photo);
});

const remove = catchAsync(async (req, res) => {
  await photoService.deletePhoto(req.params.photoId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  create,
  listMine,
  getOne,
  update,
  updateHotspots,
  remove,
};
