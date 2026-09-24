import Joi from 'joi';
import { objectId } from './custom.validation';

const createCollection = {
  body: Joi.object().keys({
    name: Joi.string().max(60).required(),
    isPublic: Joi.boolean(),
  }),
};

const addPhotoToCollection = {
  params: Joi.object().keys({
    collectionId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    photoId: Joi.string().custom(objectId).required(),
  }),
};

const removePhotoFromCollection = {
  params: Joi.object().keys({
    collectionId: Joi.string().custom(objectId).required(),
    photoId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = { createCollection, addPhotoToCollection, removePhotoFromCollection };
