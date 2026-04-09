const httpStatus = require('http-status');
const { Category } = require('../models');

const ApiError = require('../utils/ApiError');

/**
 * Create a new category
 * @param {Object} body - { name, isActive }
 * @returns {Promise<Category>}
 */
const createCategory = async (body) => {
  const exists = await Category.findOne({
    name: { $regex: new RegExp(`^${body.name}$`, 'i') },
  });

  if (exists) {
    throw new ApiError(httpStatus.CONFLICT, `Category "${body.name}" already exists.`);
  }

  return Category.create(body);
};

/**
 * Query categories with filters + pagination
 * @param {Object} filter  - { search, isActive }
 * @param {Object} options - { page, limit, sortBy, sortOrder }
 * @returns {Promise<{ results, total, page, limit, pages }>}
 */
const queryCategories = async (filter = {}, options = {}) => {
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
    Category.find(query).sort(sort).skip(skip).limit(limit),
    Category.countDocuments(query),
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
 * Get a single category by categoryId
 * @param {string} categoryId
 * @returns {Promise<Category>}
 */
const getCategoryById = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  return category;
};

/**
 * Update a category by ID
 * @param {string} id
 * @param {Object} updateBody - fields to update
 * @returns {Promise<Category>}
 */
const updateCategoryById = async (id, updateBody) => {
  const category = await getCategoryById(id);

  // If renaming, check for duplicate (exclude self)
  if (updateBody.name && updateBody.name !== category.name) {
    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${updateBody.name}$`, 'i') },
      _id: { $ne: id },
    });

    if (duplicate) {
      throw new ApiError(httpStatus.CONFLICT, `Category "${updateBody.name}" already exists.`);
    }
  }

  Object.assign(category, updateBody);
  await category.save();

  return category;
};

/**
 * Soft-delete a category by categoryId (sets isActive = false)
 * @param {string} categoryId
 * @returns {Promise<Category>}
 */
const deleteCategoryById = async (categoryId) => {
  const category = await getCategoryById(categoryId);

  category.isActive = false;
  await category.save();

  return category;
};

module.exports = {
  createCategory,
  queryCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
};
