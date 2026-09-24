const express = require('express');

const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const isAdmin = require('../../middlewares/admin');

const { planUpgradeValidation } = require('../../validations');
const { adminController } = require('../../controllers');

const router = express.Router();

router.use(auth(), isAdmin); // every route below requires an authenticated admin

router.get('/plan-upgrades', validate(planUpgradeValidation.listUpgradeRequests), adminController.listUpgradeRequests);
router.get(
  '/plan-upgrades/:requestId',
  validate(planUpgradeValidation.upgradeRequestParams),
  adminController.getUpgradeRequest
);
router.patch(
  '/plan-upgrades/:requestId/approve',
  validate(planUpgradeValidation.upgradeRequestParams),
  adminController.approveUpgrade
);
router.patch(
  '/plan-upgrades/:requestId/reject',
  validate(planUpgradeValidation.rejectUpgradeRequest),
  adminController.rejectUpgrade
);

module.exports = router;
