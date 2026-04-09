const httpStatus = require('http-status');
const { Unit } = require('../models');

const ApiError = require('../utils/ApiError');

/**
 * Create a new Unit
 * @param {Object} body - { name, isActive }
 * @returns {Promise<Unit>}
 */
const createUnit = async (body) => {
  const exists = await Unit.findOne({
    name: { $regex: new RegExp(`^${body.name}$`, 'i') },
  });

  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, `Unit "${body.name}" already exists.`);
  }

  return Unit.create(body);
};

/**
 * Query categories with filters + pagination
 * @param {Object} filter  - { search, isActive }
 * @param {Object} options - { page, limit, sortBy, sortOrder }
 * @returns {Promise<{ results, total, page, limit, pages }>}
 */
const queryUnits = async (filter = {}, options = {}) => {
  const { page = 1, limit = 50, sortBy = 'name', sortOrder = 'asc' } = options;

  const query = {};

  if (filter.search) {
    query.name = { $regex: filter.search, $options: 'i' };
  }

  if (filter.isActive !== undefined) {
    query.isActive = filter.isActive;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    Unit.find(query).sort(sort).skip(skip).limit(limit),
    Unit.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get a single Unit by unitId
 * @param {string} unitId
 * @returns {Promise<Unit>}
 */
const getUnitById = async (unitId) => {
  const unit = await Unit.findById(unitId);

  if (!unit) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Unit not found');
  }

  return unit;
};

/**
 * Update a Unit by ID
 * @param {string} id
 * @param {Object} updateBody - fields to update
 * @returns {Promise<Unit>}
 */
const updateUnitById = async (id, updateBody) => {
  const unit = await getUnitById(id);

  // If renaming, check for duplicate (exclude self)
  if (updateBody.name && updateBody.name !== Unit.name) {
    const duplicate = await Unit.findOne({
      name: { $regex: new RegExp(`^${updateBody.name}$`, 'i') },
      _id: { $ne: id },
    });

    if (duplicate) {
      throw new ApiError(httpStatus.CONFLICT, `Unit "${updateBody.name}" already exists.`);
    }
  }

  Object.assign(unit, updateBody);
  await unit.save();

  return unit;
};

/**
 * Soft-delete a Unit by UnitId (sets isActive = false)
 * @param {string} UnitId
 * @returns {Promise<Unit>}
 */
const deleteUnitById = async (UnitId) => {
  const unit = await getUnitById(UnitId);

  unit.isActive = false;
  await unit.save();

  return unit;
};

module.exports = {
  createUnit,
  queryUnits,
  getUnitById,
  updateUnitById,
  deleteUnitById,
};
