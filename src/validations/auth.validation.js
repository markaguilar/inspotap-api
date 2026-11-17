const Joi = require('joi');
const { password, username } = require('./custom.validation');

const register = {
  body: Joi.object()
    .keys({
      name: Joi.string().required(),
      username: Joi.string().trim().lowercase().required().custom(username),
      email: Joi.string().trim().lowercase().email().required(),
      password: Joi.string().required().custom(password),
    })
    .options({ stripUnknown: true }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
