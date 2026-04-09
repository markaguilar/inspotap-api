const express = require('express');
// middleware
const validate = require('../../middlewares/validate');

// controller
const { productController } = require('../../controllers');

const { productValidation } = require('../../validations');

const router = express.Router();

router.post('/', validate(productValidation.createProduct), productController.createProduct);

// Get all projects
router.get('/', validate(productValidation.getProducts), productController.getProducts);

router.get('/:productId', validate(productValidation.getProduct), productController.getProduct);

router.put('/:productId', validate(productValidation.updateProduct), productController.updateProduct);

module.exports = router;
