const express = require('express');
// middleware
const validate = require('../../middlewares/validate');

// controller
const { productController } = require('../../controllers');

const { productValidation, stockAdjustmentValidation } = require('../../validations');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/', validate(productValidation.createProduct), productController.createProduct);

// Get all products
router.get('/', validate(productValidation.getProducts), productController.getProducts);

router.get('/:productId', validate(productValidation.getProduct), productController.getProduct);

router.put('/:productId', validate(productValidation.updateProduct), productController.updateProduct);

router.post(
  '/:productId/adjust-stock',
  auth('adjustStock'),
  validate(stockAdjustmentValidation.adjustStock),
  productController.adjustStock
);

module.exports = router;
