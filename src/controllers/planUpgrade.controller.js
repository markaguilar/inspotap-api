const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const { planUpgradeService } = require('../services');

const create = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'Proof of payment image is required');
  const request = await planUpgradeService.createUpgradeRequest(req.user.id, req.file, req.body);
  res.status(httpStatus.ACCEPTED).send({
    message: 'Your upgrade request has been submitted and is pending review.',
    request,
  });
});

const getMine = catchAsync(async (req, res) => {
  const request = await planUpgradeService.getMyLatestUpgradeRequest(req.user.id);
  res.status(httpStatus.OK).send(request);
});

module.exports = {
  create,
  getMine,
};
