const express = require('express');

const router = express.Router();

const auth = require('../../middlewares/auth');

const { stockAdjustmentController } = require('../../controllers');

router.route('/').get(auth('getStockAdjustment'), stockAdjustmentController.getAdjustments);

module.exports = router;
