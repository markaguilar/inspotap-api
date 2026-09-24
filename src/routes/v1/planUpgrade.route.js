const express = require('express');

const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const uploadPaymentProof = require('../../middlewares/upload');

const planUpgradeValidation = require('../../validations/planUpgrade.validation');

const { planUpgradeController } = require('../../controllers');

const router = express.Router();

router.post(
  '/',
  auth(),
  uploadPaymentProof,
  validate(planUpgradeValidation.createUpgradeRequest),
  planUpgradeController.create
);

router.get('/me', auth(), planUpgradeController.getMine);

module.exports = router;
