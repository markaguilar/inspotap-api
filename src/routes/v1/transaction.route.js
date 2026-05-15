const express = require('express');

const router = express.Router();

const validate = require('../../middlewares/validate');

const { transactionController } = require('../../controllers');

const { transactionValidation } = require('../../validations');

const auth = require('../../middlewares/auth');

// ── Live POS checkout — authenticated + canCheckout flag ──────────────────────
router.route('/').post(auth('processCheckout'), validate(transactionValidation.checkout), transactionController.checkout);

router
  .route('/manual')
  .post(auth('manualEntry'), validate(transactionValidation.manualEntry), transactionController.manualEntry);

router
  .route('/manual')
  .post(auth('manualEntry'), validate(transactionValidation.manualEntry), transactionController.manualEntry);

// ── List transactions ─────────────────────────────────────────────────────────
// Both roles have getTransactions right.
// Cashier sees only their own (enforced in service layer via req.user).

router
  .route('/')
  .get(auth('getTransactions'), validate(transactionValidation.getTransactions), transactionController.getTransactions);

router
  .route('/:id')
  .get(auth('getTransaction'), validate(transactionValidation.getTransaction), transactionController.getTransaction);

router
  .route('/:id/void')
  .put(auth('voidTransaction'), validate(transactionValidation.voidTransaction), transactionController.voidTransaction);

module.exports = router;
