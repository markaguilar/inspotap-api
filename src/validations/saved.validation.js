const Joi = require('joi');
const { objectId } = require('./custom.validation');

const savedPhotoParams = {
  params: Joi.object().keys({
    photoId: Joi.string().custom(objectId).required(),
  }),
};

const listSaved = {
  query: Joi.object().keys({
    cursor: Joi.string().custom(objectId),
    limit: Joi.number().integer().min(1).max(50),
  }),
};

module.exports = { savedPhotoParams, listSaved };
