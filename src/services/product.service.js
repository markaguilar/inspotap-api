const httpStatus = require('http-status');
const { Product } = require('../models');
// const { getUserById } = require('./user.service');
const ApiError = require('../utils/ApiError');

const createProduct = async (productBody) => {
  // const user = await getUserById(productBody.user);

  /*   if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  } */

  const product = await Product.create(productBody);

  return product.populate('products', 'name');
};

const queryProducts = async (filter = {}, options = {}) => {
  const { sortBy = 'createdAt:desc', limit = 10, page = 1, search, ...restOptions } = options;

  const queryFilter = { ...filter };

  if (search) {
    queryFilter.$or = [
      { sku: search }, // exact barcode/SKU match
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const paginateOptions = {
    sortBy,
    limit: parseInt(limit, 10),
    page: parseInt(page, 10),
    ...restOptions,
  };

  return Product.paginate(queryFilter, paginateOptions);
};

const getProductById = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return product;
};

const updateProductById = async (productId, updateBody) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // Don't allow updating these fields
  const restrictedFields = ['status'];
  restrictedFields.forEach((field) => {
    // eslint-disable-next-line no-param-reassign
    delete updateBody[field];
  });
  // eslint-disable-next-line no-param-reassign
  delete updateBody._id;

  Object.assign(product, updateBody);
  await product.save();

  return product.populate();
};

module.exports = {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
};
