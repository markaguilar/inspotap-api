const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { unitService } = require('../services');
const pick = require('../utils/pick');

const createUnit = catchAsync(async (req, res) => {
  const unit = await unitService.createUnit({
    ...req.body,
  });

  res.status(httpStatus.CREATED).send(unit);
});

const getUnits = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const units = await unitService.queryUnits(filter, options);

  res.send(units);
});

const getUnit = catchAsync(async (req, res) => {
  const unit = await unitService.getUnitById(req.params.unitId);

  res.status(httpStatus.OK).json({
    success: true,
    data: unit,
  });
});

/**
 * PUT /api/v1/units/:unitId
 */
const updateUnit = catchAsync(async (req, res) => {
  const unit = await unitService.updateUnitById(req.params.unitId, req.body);

  res.status(httpStatus.OK).json({
    success: true,
    data: unit,
    message: 'Unit updated successfully.',
  });
});

/**
 * DELETE /api/v1/units/:unitId
 */
const deleteUnit = catchAsync(async (req, res) => {
  await unitService.deleteUnitById(req.params.id);

  res.status(httpStatus.OK).json({
    success: true,
    data: null,
    message: 'Unit remove successfully.',
  });
});

module.exports = {
  createUnit,
  getUnits,
  getUnit,
  updateUnit,
  deleteUnit,
};
