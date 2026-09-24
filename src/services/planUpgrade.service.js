const mongoose = require('mongoose');
const httpStatus = require('http-status');

const ApiError = require('../utils/ApiError');

const { PlanUpgradeRequest, Payment, Plan, User } = require('../models');

const { planService } = require('./plan.service');
const { cloudinaryService } = require('./cloudinary.service');

const createUpgradeRequest = async (userId, file, body) => {
  const existingPending = await PlanUpgradeRequest.findOne({ user: userId, status: 'pending' });
  if (existingPending) {
    throw new ApiError(httpStatus.CONFLICT, 'You already have a pending upgrade request.');
  }

  const requestedPlan = await planService.getPlanByKey(body.planKey);

  const user = await User.findById(userId);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  if (user.plan.toString() === requestedPlan.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You are already on this plan.');
  }

  const proof = await cloudinaryService.uploadImageBuffer(file.buffer, `inspotap/payments/${userId}`);

  const payment = await Payment.create({
    user: userId,
    plan: requestedPlan.id,
    amount: requestedPlan.price,
    method: body.method,
    referenceNumber: body.referenceNumber,
    proofImageUrl: proof.secure_url,
    proofImagePublicId: proof.public_id,
    status: 'pending',
  });

  const request = await PlanUpgradeRequest.create({
    user: userId,
    currentPlan: user.plan,
    requestedPlan: requestedPlan.id,
    payment: payment.id,
    status: 'pending',
  });

  await User.findByIdAndUpdate(userId, { planStatus: 'pending_upgrade' });
  return request;
};

const getMyLatestUpgradeRequest = async (userId) => {
  return PlanUpgradeRequest.findOne({ user: userId }).sort({ createdAt: -1 }).populate('requestedPlan currentPlan payment');
};

const listUpgradeRequests = async (status, cursor, limit = 20) => {
  const query = {};
  if (status) query.status = status;
  if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  const requests = await PlanUpgradeRequest.find(query)
    .sort({ _id: -1 })
    .limit(limit)
    .populate('user', 'username email')
    .populate('currentPlan requestedPlan payment');

  const nextCursor = requests.length === limit ? requests[requests.length - 1].id : null;
  return { requests, nextCursor };
};

const getUpgradeRequestById = async (requestId) => {
  const request = await PlanUpgradeRequest.findById(requestId).populate('user currentPlan requestedPlan payment');
  if (!request) throw new ApiError(httpStatus.NOT_FOUND, 'Upgrade request not found');
  return request;
};

/**
 * Approves a pending upgrade request: verifies the payment, applies the new
 * plan to the user, and sets the expiry — all inside one transaction so the
 * three writes can never partially apply.
 */
const approveUpgradeRequest = async (requestId, adminId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const request = await PlanUpgradeRequest.findById(requestId).session(session);
    if (!request) throw new ApiError(httpStatus.NOT_FOUND, 'Upgrade request not found');
    if (request.status !== 'pending') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'This request has already been reviewed.');
    }

    const plan = await Plan.findById(request.requestedPlan).session(session);
    if (!plan) throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found');

    await Payment.findByIdAndUpdate(
      request.payment,
      { status: 'verified', verifiedBy: adminId, verifiedAt: new Date() },
      { session }
    );

    await User.findByIdAndUpdate(
      request.user,
      {
        plan: plan.id,
        planStatus: 'active',
        planExpiresAt: new Date(Date.now() + plan.billingCycleDays * 24 * 60 * 60 * 1000),
      },
      { session }
    );

    request.status = 'approved';
    request.reviewedBy = new mongoose.Types.ObjectId(adminId);
    request.reviewedAt = new Date();
    await request.save({ session });

    await session.commitTransaction();
    return request;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const rejectUpgradeRequest = async (requestId, adminId, reviewNote = '') => {
  const request = await PlanUpgradeRequest.findById(requestId);
  if (!request) throw new ApiError(httpStatus.NOT_FOUND, 'Upgrade request not found');
  if (request.status !== 'pending') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This request has already been reviewed.');
  }

  await Payment.findByIdAndUpdate(request.payment, { status: 'rejected' });
  // revert the user out of "pending_upgrade" back to active on their current plan
  await User.findByIdAndUpdate(request.user, { planStatus: 'active' });

  request.status = 'rejected';
  request.reviewedBy = new mongoose.Types.ObjectId(adminId);
  request.reviewedAt = new Date();
  request.reviewNote = reviewNote;
  await request.save();
  return request;
};

module.exports = {
  createUpgradeRequest,
  getMyLatestUpgradeRequest,
  listUpgradeRequests,
  getUpgradeRequestById,
  approveUpgradeRequest,
  rejectUpgradeRequest,
};
