const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const openShift = {
  body: Joi.object({
    openingCash: Joi.number().min(0).required().messages({
      'number.min': 'Opening cash must be 0 or more.',
      'any.required': 'Opening cash is required.',
    }),
  }),
};

const closeShift = {
  body: Joi.object({
    closingCash: Joi.number().min(0).required().messages({
      'number.min': 'Closing cash must be 0 or more.',
      'any.required': 'Closing cash is required.',
    }),
    notes: Joi.string().trim().max(300).optional().allow(''),
  }),
};

const getShifts = {
  query: Joi.object({
    cashier: Joi.string().custom(objectId).optional(),
    status: Joi.string().valid('open', 'closed').optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = { openShift, closeShift, getShifts };
