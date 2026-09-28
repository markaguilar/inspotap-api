const Joi = require('joi');

const updateProfile = {
  body: Joi.object()
    .keys({
      bio: Joi.string().max(280).allow(''),
      avatarUrl: Joi.string().uri().allow(''),
      username: Joi.string().alphanum().min(3).max(30).lowercase(),
    })
    .min(1),
};

const getPublicProfile = {
  params: Joi.object().keys({
    username: Joi.string().required(),
  }),
};

module.exports = { updateProfile, getPublicProfile };
