const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');

const { planService } = require('../services');

const listPlans = catchAsync(async (_req, res) => {
  const plans = await planService.getAllActivePlans();
  res.status(httpStatus.OK).send(plans);
});

module.exports = { listPlans };
