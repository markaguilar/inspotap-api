const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const transactionService = require('../services/transaction.service');

/**
 * POST /api/v1/transactions
 * Live POS checkout — any authenticated user with canCheckout = true
 */
const checkout = catchAsync(async (req, res) => {
  const io = req.app.get('io');
  const txn = await transactionService.checkout(req.body, req.user, io);

  res.status(httpStatus.CREATED).json({
    success: true,
    data: txn,
    message: 'Checkout successful.',
  });
});

/**
 * POST /api/v1/transactions/manual
 * Manual backdated entry — owner only
 */
const manualEntry = catchAsync(async (req, res) => {
  const io = req.app.get('io');
  const txn = await transactionService.manualEntry(req.body, req.user, io);

  res.status(httpStatus.CREATED).json({
    success: true,
    data: txn,
    message: 'Manual entry saved.',
  });
});

/**
 * GET /api/v1/transactions
 */
const getTransactions = catchAsync(async (req, res) => {
  const { from, to, source, soldBy, paymentMethod, status, cashier, page, limit, sortBy, sortOrder } = req.query;

  const filter = { from, to, source, soldBy, paymentMethod, status, cashier };
  const options = { page, limit, sortBy, sortOrder };

  const result = await transactionService.queryTransactions(filter, options);

  res.status(httpStatus.OK).json({
    success: true,
    data: result.results,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    },
  });
});

/**
 * GET /api/v1/transactions/:id
 */
const getTransaction = catchAsync(async (req, res) => {
  const txn = await transactionService.getTransactionById(req.params.id);

  res.status(httpStatus.OK).json({
    success: true,
    data: txn,
  });
});

/**
 * PUT /api/v1/transactions/:id/void
 * Owner only
 */
const voidTransaction = catchAsync(async (req, res) => {
  const io = req.app.get('io');
  const txn = await transactionService.voidTransaction(req.params.id, req.body.reason, req.user, io);

  res.status(httpStatus.OK).json({
    success: true,
    data: txn,
    message: 'Transaction voided. Stock has been restored.',
  });
});

module.exports = {
  checkout,
  manualEntry,
  getTransactions,
  getTransaction,
  voidTransaction,
};
