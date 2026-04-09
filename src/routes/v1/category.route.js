const express = require('express');
// middleware
const validate = require('../../middlewares/validate');

// controller
const { categoryController } = require('../../controllers');

const { categoryValidation } = require('../../validations');

const router = express.Router();

router.post('/', categoryController.createCategory);

// Get all projects
router.get('/', validate(categoryValidation.getCategories), categoryController.getCategories);

router.get('/:categoryId', validate(categoryValidation.getCategory), categoryController.getCategory);

router.put('/:categoryId', validate(categoryValidation.updateCategory), categoryController.updateCategory);

router.delete('/:categoryId', validate(categoryValidation.deleteCategory), categoryController.deleteCategory);

module.exports = router;
