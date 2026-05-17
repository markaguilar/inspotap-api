const httpStatus = require('http-status');
const dayjs = require('dayjs');
const catchAsync = require('../utils/catchAsync');
const { reportsService } = require('../services');
const auditLogService = require('../services/auditLog.service');

/**
 * GET /api/v1/reports/summary
 * Today's at-a-glance snapshot for the dashboard cards.
 */
const getSummary = catchAsync(async (req, res) => {
  const data = await reportsService.getSummary();

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/daily?date=YYYY-MM-DD&includeManual=true
 */
const getDaily = catchAsync(async (req, res) => {
  const { date = dayjs().format('YYYY-MM-DD'), includeManual = true } = req.query;

  const data = await reportsService.getDaily(dayjs(date).format('YYYY-MM-DD'), String(includeManual) !== 'false');

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/daily/compare?date=YYYY-MM-DD
 * Today vs yesterday vs same weekday last week.
 */
const getDailyComparison = catchAsync(async (req, res) => {
  const date = req.query.date ? dayjs(req.query.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

  const data = await reportsService.getDailyComparison(date);

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/sellers?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Revenue breakdown per soldBy name.
 */
const getSellers = catchAsync(async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const from = req.query.from ? dayjs(req.query.from).format('YYYY-MM-DD') : today;
  const to = req.query.to ? dayjs(req.query.to).format('YYYY-MM-DD') : today;

  const data = await reportsService.getSellers(from, to);

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/utang?date=YYYY-MM-DD
 * Outstanding utang / credit sales summary.
 */
const getUtangSummary = catchAsync(async (req, res) => {
  const date = req.query.date ? dayjs(req.query.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

  const data = await reportsService.getUtangSummary(date);

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/audit-logs
 * Paginated audit log viewer — owner only.
 */
const getAuditLogs = catchAsync(async (req, res) => {
  const { performedBy, action, targetModel, from, to, page, limit, sortOrder } = req.query;

  const result = await auditLogService.queryLogs({ performedBy, action, targetModel, from, to }, { page, limit, sortOrder });

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

module.exports = {
  getSummary,
  getDaily,
  getDailyComparison,
  getSellers,
  getUtangSummary,
  getAuditLogs,
};
