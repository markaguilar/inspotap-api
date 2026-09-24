import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';

import ApiError from '../utils/ApiError';

const { User } = require('../models');

/**
 * Runs BEFORE the (relatively expensive) Cloudinary upload. Reads the user's
 * plan limit and stashes it on req so the controller/service don't need to
 * populate the plan a second time. The actual atomic "claim a slot" happens
 * in photo.service.ts#createPhoto to avoid a check-then-act race condition;
 * this middleware is a fast, friendly pre-check so a user over their limit
 * gets a clear 403 without wasting an upload attempt.
 */
// eslint-disable-next-line import/prefer-default-export
export const checkPhotoLimit = catchAsync(async (req, _res, next) => {
  const user = await User.findById(req.user.id).populate('plan');
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const { plan } = user;

  if (plan.photoLimit !== null && user.photoCount >= plan.photoLimit) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `You've reached the ${plan.displayName} plan limit of ${plan.photoLimit} photos. Upgrade to upload more.`
    );
  }

  req.userPlanLimit = plan.photoLimit;
  next();
});

module.exports = checkPhotoLimit;
