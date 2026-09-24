const express = require('express');

const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const collectionValidation = require('../../validations/collection.validation');

// controller
const { collectionController } = require('../../controllers');

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(collectionValidation.createCollection), collectionController.create)
  .get(auth(), collectionController.listMine);

router
  .route('/:collectionId/photos')
  .post(auth('getCollections'), validate(collectionValidation.addPhotoToCollection), collectionController.addPhoto);

router
  .route('/:collectionId/photos/:photoId')
  .delete(
    auth('getCollections'),
    validate(collectionValidation.removePhotoFromCollection),
    collectionController.removePhoto
  );

module.exports = router;
