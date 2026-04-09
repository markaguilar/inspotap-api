const Joi = require('joi');
const { objectId } = require('./custom.validation');

// ── Reusable primitives ───────────────────────────────────────────────────────

/** Positive number — price fields */
const price = Joi.number().min(0).precision(2);

/** Non-negative integer — qty fields */
const qty = Joi.number().integer().min(0);

// ── POST /products ─────────────────────────────────────────────────────────────

const createProduct = {
  body: Joi.object({
    // Core identity
    name: Joi.string().trim().min(2).max(80).required().messages({
      'string.min': 'Product name must be at least 2 characters.',
      'string.max': 'Product name must be at most 80 characters.',
      'any.required': 'Product name is required.',
    }),

    sku: Joi.string().trim().max(40).optional().allow(''),

    category: Joi.string().custom(objectId).required().messages({ 'any.required': 'Category is required.' }),

    unit: Joi.string().trim().min(1).max(30).required().messages({ 'any.required': 'Unit is required.' }),

    // Pricing — cross-field rule enforced below via .custom()
    buyingPrice: price.required().messages({
      'number.min': 'Buying price must be 0 or more.',
      'any.required': 'Buying price is required.',
    }),

    sellingPrice: price.required().messages({
      'number.min': 'Selling price must be 0 or more.',
      'any.required': 'Selling price is required.',
    }),

    // Stock
    stockQty: qty.required().messages({ 'any.required': 'Stock quantity is required.' }),

    lowStockThreshold: qty.min(1).default(5).messages({ 'number.min': 'Low stock threshold must be at least 1.' }),

    // Loose / tingi selling — looseUnit + loosePrice only required when hasLooseUnit is true
    hasLooseUnit: Joi.boolean().default(false),

    looseUnit: Joi.when('hasLooseUnit', {
      is: true,
      then: Joi.string()
        .trim()
        .min(1)
        .max(30)
        .required()
        .messages({ 'any.required': 'Loose unit label is required when tingi selling is enabled.' }),
      otherwise: Joi.string().trim().max(30).optional().allow(''),
    }),

    loosePrice: Joi.when('hasLooseUnit', {
      is: true,
      then: price.min(0.01).required().messages({
        'number.min': 'Loose price must be greater than 0.',
        'any.required': 'Loose price is required when tingi selling is enabled.',
      }),
      otherwise: price.optional().allow(0),
    }),

    imageUrl: Joi.string().uri().optional().allow(''),
    isActive: Joi.boolean().default(true),
  })
    // Cross-field: sellingPrice must be >= buyingPrice
    .custom((value, helpers) => {
      if (value.sellingPrice < value.buyingPrice) {
        return helpers.error('any.invalid', {
          message: 'Selling price must be greater than or equal to buying price.',
        });
      }
      return value;
    })
    .messages({
      'any.invalid': 'Selling price must be greater than or equal to buying price.',
    }),
};

// ── GET /products (list with filters) ────────────────────────────────────────

const getProducts = {
  query: Joi.object({
    // Full-text search across name + sku
    search: Joi.string().trim().max(100).optional(),

    // Filter by category ObjectId
    category: Joi.string().custom(objectId).optional(),

    // Filter by unit
    unit: Joi.string().trim().max(30).optional(),

    // Show only low-stock items (stockQty <= lowStockThreshold)
    lowStock: Joi.boolean().optional(),

    // Show only active / inactive
    isActive: Joi.boolean().optional(),

    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),

    // Sorting
    sortBy: Joi.string()
      .valid('name', 'sellingPrice', 'buyingPrice', 'stockQty', 'createdAt', 'updatedAt')
      .default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// ── GET /products/:id ─────────────────────────────────────────────────────────

const getProduct = {
  params: Joi.object({
    productId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),
};

// ── PUT /products/:productId ─────────────────────────────────────────────────────────

const updateProduct = {
  params: Joi.object({
    productId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),

  body: Joi.object({
    // All fields optional on update — only validate what is sent
    name: Joi.string().trim().min(2).max(80).optional(),
    sku: Joi.string().trim().max(40).optional().allow(''),

    // Note: category and unit use the same rules as create, just optional
    category: Joi.string().custom(objectId).optional(),
    unit: Joi.string().trim().min(1).max(30).optional(),

    buyingPrice: price.optional(),
    sellingPrice: price.optional(),

    lowStockThreshold: qty.min(1).optional(),

    hasLooseUnit: Joi.boolean().optional(),

    looseUnit: Joi.when('hasLooseUnit', {
      is: true,
      then: Joi.string()
        .trim()
        .min(1)
        .max(30)
        .required()
        .messages({ 'any.required': 'Loose unit label is required when tingi selling is enabled.' }),
      otherwise: Joi.string().trim().max(30).optional().allow(''),
    }),

    loosePrice: Joi.when('hasLooseUnit', {
      is: true,
      then: price
        .min(0.01)
        .required()
        .messages({ 'any.required': 'Loose price is required when tingi selling is enabled.' }),
      otherwise: price.optional().allow(0),
    }),

    imageUrl: Joi.string().uri().optional().allow(''),
    isActive: Joi.boolean().optional(),
  })
    // Prevent stockQty from being updated directly through this route
    // Stock changes must go through POST /products/:id/adjust-stock
    .custom((value, helpers) => {
      if ('stockQty' in value) {
        return helpers.error('any.unknown', { label: 'stockQty' });
      }
      return value;
    })
    .messages({
      'any.unknown': '"stockQty" cannot be updated directly. Use the stock adjustment endpoint.',
    })
    // Cross-field: only applies when both prices are present in the payload
    .custom((value, helpers) => {
      const { buyingPrice, sellingPrice } = value;
      if (buyingPrice !== undefined && sellingPrice !== undefined && sellingPrice < buyingPrice) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Selling price must be greater than or equal to buying price.',
    })
    // Ensure at least one field is being updated
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update.',
    }),
};

// ── DELETE /products/:id ──────────────────────────────────────────────────────

const deleteProduct = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),
};

// ── POST /products/:id/adjust-stock ──────────────────────────────────────────

const adjustStock = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Product ID is required.' }),
  }),

  body: Joi.object({
    type: Joi.string().valid('add', 'subtract').required().messages({
      'any.only': '"type" must be either "add" or "subtract".',
      'any.required': '"type" is required.',
    }),

    reason: Joi.string().valid('restock', 'damage', 'expiry', 'correction', 'theft', 'other').required().messages({
      'any.only': '"reason" must be one of: restock, damage, expiry, correction, theft, other.',
      'any.required': '"reason" is required.',
    }),

    qty: Joi.number().integer().min(1).required().messages({
      'number.min': 'Adjustment quantity must be at least 1.',
      'any.required': '"qty" is required.',
    }),

    notes: Joi.string().trim().max(200).optional().allow(''),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
};
