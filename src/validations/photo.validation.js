import Joi from 'joi';

import { objectId } from './custom.validation';

const hotspotSchema = Joi.object({
  xPercent: Joi.number().min(0).max(100).required(),
  yPercent: Joi.number().min(0).max(100).required(),
  productName: Joi.string().max(120).required(),
  affiliateUrl: Joi.string().uri().required(),
  price: Joi.number().min(0).allow(null),
});

const createPhoto = {
  body: Joi.object().keys({
    caption: Joi.string().max(500).allow(''),
    hotspots: Joi.array().items(hotspotSchema).max(10),
    isPublic: Joi.boolean(),
  }),
};

const updateHotspots = {
  params: Joi.object().keys({
    photoId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    hotspots: Joi.array().items(hotspotSchema).max(10).required(),
  }),
};

const updatePhoto = {
  params: Joi.object().keys({
    photoId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      caption: Joi.string().max(500).allow(''),
      isPublic: Joi.boolean(),
    })
    .min(1),
};

const getOrDeletePhoto = {
  params: Joi.object().keys({
    photoId: Joi.string().custom(objectId).required(),
  }),
};

const listMyPhotos = {
  query: Joi.object().keys({
    cursor: Joi.string().custom(objectId),
    limit: Joi.number().integer().min(1).max(50),
  }),
};

module.exports = { createPhoto, updateHotspots, updatePhoto, getOrDeletePhoto, listMyPhotos };
