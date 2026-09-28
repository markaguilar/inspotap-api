const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createUpgradeRequest = {
  body: Joi.object().keys({
    planKey: Joi.string().valid('spark', 'infinity').required(),
    method: Joi.string().valid('gcash', 'bank_transfer').required(),
    referenceNumber: Joi.string().min(4).max(60).required(),
  }),
};

const upgradeRequestParams = {
  params: Joi.object().keys({
    requestId: Joi.string().custom(objectId).required(),
  }),
};

const rejectUpgradeRequest = {
  params: Joi.object().keys({
    requestId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    reviewNote: Joi.string().max(300).allow(''),
  }),
};

const listUpgradeRequests = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'approved', 'rejected'),
    cursor: Joi.string().custom(objectId),
    limit: Joi.number().integer().min(1).max(50),
  }),
};

module.exports = { createUpgradeRequest, upgradeRequestParams, rejectUpgradeRequest, listUpgradeRequests };
