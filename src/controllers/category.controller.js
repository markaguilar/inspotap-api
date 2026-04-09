const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { categoryService } = require('../services');
const pick = require('../utils/pick');

const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory({
    ...req.body,
  });

  res.status(httpStatus.CREATED).send(category);
});

const getCategories = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const categories = await categoryService.queryCategories(filter, options);

  res.send(categories);
});

const getCategory = catchAsync(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.categoryId);

  res.status(httpStatus.OK).json({
    success: true,
    data: category,
  });
});

/**
 * PUT /api/v1/categories/:categoryId
 */
const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategoryById(req.params.categoryId, req.body);

  res.status(httpStatus.OK).json({
    success: true,
    data: category,
    message: 'Category updated successfully.',
  });
});

/**
 * DELETE /api/v1/categories/:categoryId
 */
const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategoryById(req.params.id);

  res.status(httpStatus.OK).json({
    success: true,
    data: null,
    message: 'Category deactivated successfully.',
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
