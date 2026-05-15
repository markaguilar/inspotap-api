const httpStatus = require('http-status');

const catchAsync = require('../utils/catchAsync');

const { shiftService } = require('../services');

const openShiftCtrl = catchAsync(async (req, res) => {
  const shift = await shiftService.openShift(req.user, req.body.openingCash, req);
  res.status(httpStatus.CREATED).json({ success: true, data: shift, message: 'Shift opened.' });
});

const closeShiftCtrl = catchAsync(async (req, res) => {
  const shift = await shiftService.closeShift(req.user, req.body.closingCash, req.body.notes, req);
  res.status(httpStatus.OK).json({ success: true, data: shift, message: 'Shift closed successfully.' });
});

const getActiveShiftCtrl = catchAsync(async (req, res) => {
  const shift = await shiftService.getActiveShift(req.user._id);
  res.status(httpStatus.OK).json({ success: true, data: shift });
});

const getShiftsCtrl = catchAsync(async (req, res) => {
  const { cashier, status, from, to, page, limit } = req.query;
  const result = await shiftService.queryShifts({ cashier, status, from, to }, { page, limit }, req.user);
  res.status(httpStatus.OK).json({
    success: true,
    data: result.results,
    pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages },
  });
});

module.exports = { openShiftCtrl, closeShiftCtrl, getActiveShiftCtrl, getShiftsCtrl };
