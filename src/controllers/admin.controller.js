const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { adminService } = require('../services');

const listUpgradeRequests = catchAsync(async (req, res) => {
  const { status, cursor, limit } = req.query;
  const result = await adminService.listUpgradeRequests(status, cursor ?? null, Number(limit) || 20);
  res.status(httpStatus.OK).send(result);
});

const getUpgradeRequest = catchAsync(async (req, res) => {
  const request = await adminService.getUpgradeRequestById(req.params.requestId);
  res.status(httpStatus.OK).send(request);
});

const approveUpgrade = catchAsync(async (req, res) => {
  const request = await adminService.approveUpgradeRequest(req.params.requestId, req.user.id);
  res.status(httpStatus.OK).send({ message: 'Upgrade approved and applied.', request });
});

const rejectUpgrade = catchAsync(async (req, res) => {
  const request = await adminService.rejectUpgradeRequest(req.params.requestId, req.user.id, req.body.reviewNote);
  res.status(httpStatus.OK).send({ message: 'Upgrade request rejected.', request });
});

module.exports = {
  listUpgradeRequests,
  getUpgradeRequest,
  approveUpgrade,
  rejectUpgrade,
};
