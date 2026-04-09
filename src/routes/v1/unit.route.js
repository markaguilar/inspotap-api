const express = require('express');
// middleware
const validate = require('../../middlewares/validate');

// controller
const { unitController } = require('../../controllers');

const { unitValidation } = require('../../validations');

const router = express.Router();

router.post('/', validate(unitValidation.createUnit), unitController.createUnit);

// Get all projects
router.get('/', validate(unitValidation.getUnits), unitController.getUnits);

router.get('/:unitId', validate(unitValidation.getUnit), unitController.getUnit);

router.put('/:unitId', validate(unitValidation.updateUnit), unitController.updateUnit);

router.delete('/:unitId', validate(unitValidation.deleteUnit), unitController.deleteUnit);

module.exports = router;
