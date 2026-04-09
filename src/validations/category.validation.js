const Joi = require('joi');
const { objectId } = require('./custom.validation');

// ── POST /categories ──────────────────────────────────────────────────────────

const createCategory = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      'string.min': 'Category name must be at least 2 characters.',
      'string.max': 'Category name must be at most 50 characters.',
      'any.required': 'Category name is required.',
    }),

    isActive: Joi.boolean().default(true),
  }),
};

// ── GET /categories ───────────────────────────────────────────────────────────

const getCategories = {
  query: Joi.object({
    search: Joi.string().trim().max(100).optional(),
    isActive: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string().valid('name', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

// ── GET /categories/:categoryId ───────────────────────────────────────────────────────

const getCategory = {
  params: Joi.object({
    categoryId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Category ID is required.' }),
  }),
};

// ── PUT /categories/:categoryId ───────────────────────────────────────────────────────

const updateCategory = {
  params: Joi.object({
    categoryId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Category ID is required.' }),
  }),

  body: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional().messages({
      'string.min': 'Category name must be at least 2 characters.',
      'string.max': 'Category name must be at most 50 characters.',
    }),

    isActive: Joi.boolean().optional(),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update.',
    }),
};

// ── DELETE /categories/:categoryId ────────────────────────────────────────────────────

const deleteCategory = {
  params: Joi.object({
    categoryId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Category ID is required.' }),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
