const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

// ── POST /suppliers ───────────────────────────────────────────────────────────

const createSupplier = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).required().messages({
      'string.min': 'Supplier name must be at least 2 characters.',
      'string.max': 'Supplier name must be at most 80 characters.',
      'any.required': 'Supplier name is required.',
    }),
    contactPerson: Joi.string().trim().max(80).optional().allow(''),
    phone: Joi.string().trim().max(20).optional().allow(''),
    email: Joi.string().trim().email().optional().allow(''),
    address: Joi.string().trim().max(200).optional().allow(''),
    category: Joi.string().trim().max(80).optional().allow(''),
    deliverySchedule: Joi.string().trim().max(100).optional().allow(''),
    minimumOrder: Joi.number().min(0).optional().default(0),
    paymentTerms: Joi.string().trim().max(50).optional().default('COD'),
    notes: Joi.string().trim().max(300).optional().allow(''),
  }),
};

// ── GET /suppliers ────────────────────────────────────────────────────────────

const getSuppliers = {
  query: Joi.object({
    search: Joi.string().trim().max(100).optional().allow(''),
    isActive: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

// ── GET /suppliers/:id ────────────────────────────────────────────────────────

const getSupplier = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Supplier ID is required.' }),
  }),
};

// ── PUT /suppliers/:id ────────────────────────────────────────────────────────

const updateSupplier = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).optional(),
    contactPerson: Joi.string().trim().max(80).optional().allow(''),
    phone: Joi.string().trim().max(20).optional().allow(''),
    email: Joi.string().trim().email().optional().allow(''),
    address: Joi.string().trim().max(200).optional().allow(''),
    category: Joi.string().trim().max(80).optional().allow(''),
    deliverySchedule: Joi.string().trim().max(100).optional().allow(''),
    minimumOrder: Joi.number().min(0).optional(),
    paymentTerms: Joi.string().trim().max(50).optional().allow(''),
    notes: Joi.string().trim().max(300).optional().allow(''),
    isActive: Joi.boolean().optional(),
  })
    .min(1)
    .messages({ 'object.min': 'At least one field must be provided.' }),
};

// ── DELETE /suppliers/:id ─────────────────────────────────────────────────────

const deleteSupplier = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
