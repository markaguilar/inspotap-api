const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { productService } = require('../services');
const pick = require('../utils/pick');

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct({
    ...req.body,
  });

  res.status(httpStatus.CREATED).send(product);
});

/**
 * Get all products with optional filtering and pagination
 * Query params: title, category, status, minBudget, maxBudget, sortBy, limit, page
 */
const getProducts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'search']);

  const products = await productService.queryProducts(filter, options);

  res.send(products);
});

const getProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const data = await productService.getProductById(productId);

  res.send({ data });
});

const updateProduct = catchAsync(async (req, res) => {
  // req.product already exists, just update it
  const updatedProduct = await productService.updateProductById(req.params.productId, req.body);
  res.send(updatedProduct);
});

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
};
