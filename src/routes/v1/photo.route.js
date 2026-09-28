const express = require('express');

const auth = require('../../middlewares/auth'); // your existing auth() from the auth module
const validate = require('../../middlewares/validate');
const checkPhotoLimit = require('../../middlewares/planLimit');

const photoValidation = require('../../validations/photo.validation');

const photoController = require('../../controllers/photo.controller');

const router = express.Router();

router
  .route('/')
  .post(auth(), checkPhotoLimit, validate(photoValidation.createPhoto), photoController.create)
  .get(auth(), validate(photoValidation.listMyPhotos), photoController.listMine);

router
  .route('/:photoId')
  .get(validate(photoValidation.getOrDeletePhoto), photoController.getOne)
  .patch(auth(), validate(photoValidation.updatePhoto), photoController.update)
  .delete(auth(), validate(photoValidation.getOrDeletePhoto), photoController.remove);

router.patch('/:photoId/hotspots', auth(), validate(photoValidation.updateHotspots), photoController.updateHotspots);

module.exports = router;
