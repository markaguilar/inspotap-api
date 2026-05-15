const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * canCheckout middleware
 *
 * Runs after protect (req.user is available).
 * Checks:
 *   1. user.canCheckout is true   — owner can toggle this per user
 *   2. user.isActive is true      — account not disabled
 *
 * Future: also check open shift here when shift system is built.
 *
 * Owner accounts always bypass — they can always process sales.
 */
const canCheckout = catchAsync(async (req, res, next) => {
  const { user } = req;

  // Owners bypass the canCheckout flag
  if (user.role === 'owner') return next();

  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been deactivated. Please contact the store owner.');
  }

  if (!user.canCheckout) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to process checkouts. Please contact the store owner.');
  }

  next();
});

module.exports = canCheckout;
