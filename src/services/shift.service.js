const httpStatus = require('http-status');

const { Shift, Transaction } = require('../models');

const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');

/**
 * Open a new shift for the cashier.
 * Enforces only one open shift per cashier at a time.
 */
const openShift = async (cashier, openingCash, req = null) => {
  const existing = await Shift.findOne({ cashier: cashier._id, status: 'open' });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'You already have an open shift. Please close it before opening a new one.');
  }

  const shift = await Shift.create({
    cashier: cashier._id,
    cashierName: cashier.name,
    openingCash,
    status: 'open',
  });

  auditLogService.log({
    performedBy: cashier,
    action: 'SHIFT_OPENED',
    targetModel: 'Shift',
    targetId: shift._id,
    after: { openingCash },
    req,
  });

  return shift;
};

/**
 * Close the cashier's current open shift.
 * Calculates totals from all transactions in the shift window.
 */
const closeShift = async (cashier, closingCash, notes = '', req = null) => {
  const shift = await Shift.findOne({ cashier: cashier._id, status: 'open' });

  if (!shift) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No open shift found for your account.');
  }

  // Aggregate all completed transactions since shift was opened
  const [summary] = await Transaction.aggregate([
    {
      $match: {
        cashier: cashier._id,
        saleDate: { $gte: shift.openedAt },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalTransactions: { $sum: 1 },
        totalCashSales: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0] },
        },
        totalGcashSales: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'gcash'] }, '$totalAmount', 0] },
        },
        totalMayaSales: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'maya'] }, '$totalAmount', 0] },
        },
      },
    },
  ]);

  const totalVoids = await Transaction.countDocuments({
    cashier: cashier._id,
    saleDate: { $gte: shift.openedAt },
    status: 'voided',
  });

  const totals =
    summary !== null && summary !== undefined
      ? summary
      : {
          totalSales: 0,
          totalTransactions: 0,
          totalCashSales: 0,
          totalGcashSales: 0,
          totalMayaSales: 0,
        };

  const expectedCash = shift.openingCash + totals.totalCashSales;
  const cashVariance = closingCash - expectedCash;

  Object.assign(shift, {
    status: 'closed',
    closedAt: new Date(),
    closingCash,
    totalSales: totals.totalSales,
    totalTransactions: totals.totalTransactions,
    totalCashSales: totals.totalCashSales,
    totalGcashSales: totals.totalGcashSales,
    totalMayaSales: totals.totalMayaSales,
    totalVoids,
    expectedCash,
    cashVariance,
    notes,
  });

  await shift.save();

  auditLogService.log({
    performedBy: cashier,
    action: 'SHIFT_CLOSED',
    targetModel: 'Shift',
    targetId: shift._id,
    after: {
      totalSales: shift.totalSales,
      closingCash,
      expectedCash,
      cashVariance,
    },
    req,
  });

  return shift;
};

/**
 * Get the current open shift for a cashier.
 * Returns null if no open shift exists.
 */
const getActiveShift = async (cashierId) => {
  return Shift.findOne({ cashier: cashierId, status: 'open' });
};

/**
 * Paginated shift history — owner sees all, cashier sees own.
 */
const queryShifts = async (filter = {}, options = {}, requestingUser) => {
  const { page = 1, limit = 20 } = options;

  const query = {};

  // Cashiers can only see their own shifts
  if (requestingUser.role === 'cashier') {
    query.cashier = requestingUser._id;
  } else if (filter.cashier) {
    query.cashier = filter.cashier;
  }

  if (filter.status) query.status = filter.status;

  if (filter.from || filter.to) {
    query.openedAt = {};
    if (filter.from) query.openedAt.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.openedAt.$lte = to;
    }
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Shift.find(query).sort({ openedAt: -1 }).skip(skip).limit(Number(limit)).populate('cashier', 'name email'),
    Shift.countDocuments(query),
  ]);

  return { results, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
};

module.exports = {
  openShift,
  closeShift,
  getActiveShift,
  queryShifts,
};
