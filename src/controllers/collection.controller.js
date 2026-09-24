const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { collectionService } = require('../services');

const create = catchAsync(async (req, res) => {
  const collection = await collectionService.createCollection(req.user.id, req.body);
  res.status(httpStatus.CREATED).send(collection);
});

const listMine = catchAsync(async (req, res) => {
  const collections = await collectionService.listMyCollections(req.user.id);
  res.status(httpStatus.OK).send(collections);
});

const addPhoto = catchAsync(async (req, res) => {
  const result = await collectionService.addPhotoToCollection(req.params.collectionId, req.user.id, req.body.photoId);
  res.status(httpStatus.OK).send(result);
});

const removePhoto = catchAsync(async (req, res) => {
  const result = await collectionService.removePhotoFromCollection(req.params.collectionId, req.user.id, req.params.photoId);
  res.status(httpStatus.OK).send(result);
});

module.exports = {
  create,
  listMine,
  addPhoto,
  removePhoto,
};
