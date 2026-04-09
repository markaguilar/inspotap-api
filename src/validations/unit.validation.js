const Joi = require('joi');

// ── ObjectId custom validator (your version) ──────────────────────────────────

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

// ── Allowed unit values — extend as needed ────────────────────────────────────
// These are validated on create/update to keep unit names consistent.
// If you want to allow any string, remove the .valid() call.

const UNIT_NAMES = [
  'piece',
  'pack',
  'bottle',
  'can',
  'sachet',
  'kilo',
  'gram',
  'liter',
  'bar',
  'tube',
  'box',
  'bundle',
  'roll',
  'tray',
  'bag',
  'set',
  'pair',
];

// ── POST /units ───────────────────────────────────────────────────────────────

const createUnit = {
  body: Joi.object({
    name: Joi.string().trim().lowercase().min(1).max(30).required().messages({
      'string.min': 'Unit name must be at least 1 character.',
      'string.max': 'Unit name must be at most 30 characters.',
      'any.required': 'Unit name is required.',
    }),

    isActive: Joi.boolean().default(true),
  }),
};

// ── GET /units ────────────────────────────────────────────────────────────────

const getUnits = {
  query: Joi.object({
    search: Joi.string().trim().max(100).optional(),
    isActive: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(100),
    sortBy: Joi.string().valid('name', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

// ── GET /units/:unitId ────────────────────────────────────────────────────────────

const getUnit = {
  params: Joi.object({
    unitId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Unit ID is required.' }),
  }),
};

// ── PUT /units/:unitId ────────────────────────────────────────────────────────────

const updateUnit = {
  params: Joi.object({
    unitId: Joi.string().custom(objectId).required().messages({ 'any.required': 'Unit ID is required.' }),
  }),

  body: Joi.object({
    name: Joi.string().trim().lowercase().min(1).max(30).optional().messages({
      'string.min': 'Unit name must be at least 1 character.',
      'string.max': 'Unit name must be at most 30 characters.',
    }),

    isActive: Joi.boolean().optional(),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update.',
    }),
};

// ── DELETE /units/:id ─────────────────────────────────────────────────────────

const deleteUnit = {
  params: Joi.object({
    id: Joi.string().custom(objectId).required().messages({ 'any.required': 'Unit ID is required.' }),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit,
};
