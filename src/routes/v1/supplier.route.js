const express = require('express');

const router = express.Router();

const auth = require('../../middlewares/auth');

const { supplierController } = require('../../controllers');

router.route('/').get(auth('getSuppliers'), supplierController.getSuppliers);

module.exports = router;
