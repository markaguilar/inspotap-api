const express = require('express');

const { planController } = require('../../controllers');

const router = express.Router();

router.get('/', planController.listPlans);

module.exports = router;
