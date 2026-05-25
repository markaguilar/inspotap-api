const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

// ── POST /products/:id/adjust-stock ──────────────────────────────────────────

const adjustStock = {
  params: Joi.object({
    productId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),

  body: Joi.object({
    type: Joi.string().valid('add', 'subtract').required().messages({
      'any.only': '"type" must be "add" or "subtract".',
      'any.required': '"type" is required.',
    }),

    reason: Joi.string().valid('restock', 'damage', 'expiry', 'correction', 'theft', 'other').required().messages({
      'any.only': '"reason" must be one of: restock, damage, expiry, correction, theft, other.',
      'any.required': '"reason" is required.',
    }),

    qty: Joi.number().integer().min(1).required().messages({
      'number.min': 'Adjustment quantity must be at least 1.',
      'number.integer': 'Quantity must be a whole number.',
      'any.required': '"qty" is required.',
    }),

    // Optional cost per unit — used for loss/restock cost tracking
    costPerUnit: Joi.number().min(0).optional().default(0),

    notes: Joi.string().trim().max(300).optional().allow(''),
  }),
};

// ── GET /stock-adjustments (list) ─────────────────────────────────────────────

const getAdjustments = {
  query: Joi.object({
    product: Joi.string().custom(objectId).optional(),
    reason: Joi.string().valid('restock', 'damage', 'expiry', 'correction', 'theft', 'other').optional(),
    type: Joi.string().valid('add', 'subtract').optional(),
    adjustedBy: Joi.string().custom(objectId).optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'qty', 'reason').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// ── GET /stock-adjustments/:id ────────────────────────────────────────────────

const getAdjustment = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Adjustment ID is required.' }),
  }),
};

// ── GET /products/:id/adjustments (per-product history) ───────────────────────

const getProductAdjustments = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),
  query: Joi.object({
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    reason: Joi.string().valid('restock', 'damage', 'expiry', 'correction', 'theft', 'other').optional(),
    type: Joi.string().valid('add', 'subtract').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  adjustStock,
  getAdjustments,
  getAdjustment,
  getProductAdjustments,
};
