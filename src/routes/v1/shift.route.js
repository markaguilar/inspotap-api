const express = require('express');

const router = express.Router();

const shiftController = require('../../controllers/shift.controller');

const { shiftValidation } = require('../../validations');

const auth = require('../../middlewares/auth');

const validate = require('../../middlewares/validate');

// Any logged-in user with canCheckout can open/close their own shift
router.route('/open').post(auth('manageShift'), validate(shiftValidation.openShift), shiftController.openShiftCtrl);

router.route('/close').post(auth('manageShift'), validate(shiftValidation.closeShift), shiftController.closeShiftCtrl);
router.route('/active').get(auth('manageShift'), validate(shiftController.getActiveShiftCtrl));

// Full history — owner sees all, cashier sees own (enforced in service)
router.route('/').get(auth('manageShift'), validate(shiftValidation.getShifts), shiftController.getShiftsCtrl);

module.exports = router;
