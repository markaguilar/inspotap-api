const Joi = require('joi');
const { objectId } = require('./custom.validation');

// ── Shared item schema — used in both checkout and manual entry ───────────────

const cartItemSchema = Joi.object({
  product: Joi.string().custom(objectId).required().messages({ 'any.required': 'Each item must have a product ID.' }),
  qty: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Each item must have a quantity.',
  }),
  overridePrice: Joi.number().min(0).optional(), // owner only — ignored for cashiers
});

// ── POST /transactions — live POS checkout ────────────────────────────────────

const checkout = {
  body: Joi.object({
    items: Joi.array().items(cartItemSchema).min(1).required().messages({
      'array.min': 'Cart must have at least one item.',
      'any.required': 'Items are required.',
    }),

    discount: Joi.number().min(0).default(0),

    cashTendered: Joi.number().min(0).required().messages({ 'any.required': 'Cash tendered is required.' }),

    paymentMethod: Joi.string().valid('cash', 'gcash', 'maya', 'utang', 'other').default('cash'),

    notes: Joi.string().trim().max(200).optional().allow(''),
  }),
};

// ── POST /transactions/manual — backtrack / quick-tap ─────────────────────────

const manualEntry = {
  body: Joi.object({
    mode: Joi.string().valid('backtrack', 'quick').default('backtrack'),

    items: Joi.array().items(cartItemSchema).min(1).required().messages({
      'array.min': 'At least one item is required.',
      'any.required': 'Items are required.',
    }),

    // Backdatable — ISO string or JS date
    saleDate: Joi.date().max('now').optional().messages({ 'date.max': 'Sale date cannot be in the future.' }),

    soldBy: Joi.string().trim().min(1).max(50).required().messages({ 'any.required': 'Seller name is required.' }),

    notes: Joi.string().trim().max(200).optional().allow(''),

    discount: Joi.number().min(0).default(0),

    paymentMethod: Joi.string().valid('cash', 'gcash', 'maya', 'utang', 'other').default('cash'),

    // Owner-only flag — skip stock deduction if already manually corrected
    skipStockCheck: Joi.boolean().default(false),
  }),
};

// ── GET /transactions — list with filters ─────────────────────────────────────

const getTransactions = {
  query: Joi.object({
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    source: Joi.string().valid('pos', 'manual_entry').optional(),
    soldBy: Joi.string().trim().max(50).optional().allow(''),
    paymentMethod: Joi.string().valid('cash', 'gcash', 'maya', 'utang', 'other').optional(),
    status: Joi.string().valid('completed', 'voided', 'refunded').optional(),
    cashier: Joi.string().custom(objectId).optional().allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('saleDate', 'totalAmount', 'createdAt').default('saleDate'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// ── GET /transactions/:id ─────────────────────────────────────────────────────

const getTransaction = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Transaction ID is required.' }),
  }),
};

// ── PUT /transactions/:id/void — owner only ───────────────────────────────────

const voidTransaction = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Transaction ID is required.' }),
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(200).required().messages({
      'string.min': 'Void reason must be at least 3 characters.',
      'any.required': 'A reason is required to void a transaction.',
    }),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  checkout,
  manualEntry,
  getTransactions,
  getTransaction,
  voidTransaction,
};
