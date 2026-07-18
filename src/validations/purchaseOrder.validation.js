const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

// Embedded item schema — reused in create and receive
const purchaseItemSchema = Joi.object({
  product: Joi.string().custom(objectId).required().messages({ 'any.required': 'Each item must have a product ID.' }),
  qty: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Each item must have a quantity.',
  }),
  costPerUnit: Joi.number().min(0).required().messages({
    'number.min': 'Cost must be 0 or more.',
    'any.required': 'Each item must have a cost per unit.',
  }),
});

// ── POST /purchases ───────────────────────────────────────────────────────────

const createPurchaseOrder = {
  body: Joi.object({
    supplier: Joi.string().custom(objectId).required().messages({ 'any.required': 'Supplier is required.' }),

    items: Joi.array().items(purchaseItemSchema).min(1).required().messages({
      'array.min': 'At least one item is required.',
      'any.required': 'Items are required.',
    }),

    status: Joi.string().valid('pending', 'received', 'partial', 'cancelled').default('received'),

    // Backdatable — owner may record a purchase from yesterday
    purchasedAt: Joi.date().max('now').optional().messages({ 'date.max': 'Purchase date cannot be in the future.' }),

    paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'credit', 'cheque', 'other').default('cash'),

    amountPaid: Joi.number().min(0).optional().default(0),

    notes: Joi.string().trim().max(300).optional().allow(''),
  }),
};

// ── GET /purchases ────────────────────────────────────────────────────────────

const getPurchaseOrders = {
  query: Joi.object({
    supplier: Joi.string().custom(objectId).optional().allow(''),
    status: Joi.string().valid('pending', 'received', 'partial', 'cancelled').optional(),
    paymentMethod: Joi.string().valid('cash', 'bank_transfer', 'credit', 'cheque', 'other').optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    recordedBy: Joi.string().custom(objectId).optional().allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('purchasedAt', 'totalCost', 'createdAt').default('purchasedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// ── GET /purchases/:id ────────────────────────────────────────────────────────

const getPurchaseOrder = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
};

// ── PUT /purchases/:id/receive ────────────────────────────────────────────────

const receivePurchaseOrder = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object({
    // Optionally update amountPaid on receive
    amountPaid: Joi.number().min(0).optional(),
    notes: Joi.string().trim().max(300).optional().allow(''),
  }),
};

// ── DELETE /purchases/:id ─────────────────────────────────────────────────────

const cancelPurchaseOrder = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(200).required().messages({ 'any.required': 'Cancellation reason is required.' }),
  }),
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
};
