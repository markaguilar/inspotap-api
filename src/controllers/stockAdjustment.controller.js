const httpStatus = require('http-status');
const dayjs = require('dayjs');
const catchAsync = require('../utils/catchAsync');
const stockAdjustmentService = require('../services/stockAdjustment.service');

// ── Stock Adjustment endpoints ────────────────────────────────────────────────

/**
 * POST /api/v1/products/:id/adjust-stock
 */
const adjustStock = catchAsync(async (req, res) => {
  const { adjustment, product } = await stockAdjustmentService.adjustStock(req.params.id, req.body, req.user, req);

  res.status(httpStatus.CREATED).json({
    success: true,
    data: {
      adjustment,
      product: {
        _id: product._id,
        name: product.name,
        stockQty: product.stockQty,
      },
    },
    message: `Stock ${req.body.type === 'add' ? 'added' : 'deducted'} successfully.`,
  });
});

/**
 * GET /api/v1/stock-adjustments
 * All adjustments — filtered, paginated.
 */
const getAdjustments = catchAsync(async (req, res) => {
  const { product, reason, type, adjustedBy, from, to, page, limit, sortBy, sortOrder } = req.query;

  const result = await stockAdjustmentService.queryAdjustments(
    { product, reason, type, adjustedBy, from, to },
    { page, limit, sortBy, sortOrder }
  );

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

/**
 * GET /api/v1/stock-adjustments/:id
 */
const getAdjustment = catchAsync(async (req, res) => {
  const adjustment = await stockAdjustmentService.getAdjustmentById(req.params.id);

  res.status(httpStatus.OK).json({
    success: true,
    data: adjustment,
  });
});

/**
 * GET /api/v1/products/:id/adjustments
 * Adjustment history for a specific product.
 */
const getProductAdjustments = catchAsync(async (req, res) => {
  const { reason, type, from, to, page, limit } = req.query;

  const result = await stockAdjustmentService.getProductAdjustments(
    req.params.id,
    { reason, type, from, to },
    { page, limit }
  );

  res.status(httpStatus.OK).json({
    success: true,
    data: result.results,
    product: result.product,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    },
  });
});

// ── Profit Margin endpoints ───────────────────────────────────────────────────

/**
 * GET /api/v1/reports/profit/summary?from=&to=
 * Overall profit summary: revenue, COGS, gross profit, net profit, margins.
 */
const getProfitSummary = catchAsync(async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const from = req.query.from ? dayjs(req.query.from).format('YYYY-MM-DD') : today;
  const to = req.query.to ? dayjs(req.query.to).format('YYYY-MM-DD') : today;

  const data = await stockAdjustmentService.getProfitSummary(from, to);

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

/**
 * GET /api/v1/reports/profit/products?from=&to=&sortBy=&page=&limit=
 * Per-product profit margins — sorted by profit, revenue, or margin %.
 */
const getProductProfitMargins = catchAsync(async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const from = req.query.from ? dayjs(req.query.from).format('YYYY-MM-DD') : today;
  const to = req.query.to ? dayjs(req.query.to).format('YYYY-MM-DD') : today;

  const { sortBy = 'grossProfit', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

  const data = await stockAdjustmentService.getProductProfitMargins(from, to, { sortBy, sortOrder, page, limit });

  res.status(httpStatus.OK).json({
    success: true,
    data: data.results,
    period: data.period,
    pagination: {
      total: data.total,
      page: data.page,
      limit: data.limit,
      pages: data.pages,
    },
  });
});

/**
 * GET /api/v1/reports/profit/trend?from=&to=
 * Daily profit trend — used for line charts.
 */
const getProfitTrend = catchAsync(async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const from = req.query.from
    ? dayjs(req.query.from).format('YYYY-MM-DD')
    : dayjs().subtract(29, 'day').format('YYYY-MM-DD');
  const to = req.query.to ? dayjs(req.query.to).format('YYYY-MM-DD') : today;

  const data = await stockAdjustmentService.getProfitTrend(from, to);

  res.status(httpStatus.OK).json({
    success: true,
    data: data.trend,
    period: data.period,
  });
});

/**
 * GET /api/v1/reports/profit/losses?from=&to=
 * Stock loss summary — damage, expiry, theft impact on profit.
 */
const getStockLossSummary = catchAsync(async (req, res) => {
  const today = dayjs().format('YYYY-MM-DD');
  const from = req.query.from ? dayjs(req.query.from).format('YYYY-MM-DD') : today;
  const to = req.query.to ? dayjs(req.query.to).format('YYYY-MM-DD') : today;

  const data = await stockAdjustmentService.getStockLossSummary(from, to);

  res.status(httpStatus.OK).json({
    success: true,
    data,
  });
});

module.exports = {
  // Stock adjustments
  adjustStock,
  getAdjustments,
  getAdjustment,
  getProductAdjustments,

  // Profit margin
  getProfitSummary,
  getProductProfitMargins,
  getProfitTrend,
  getStockLossSummary,
};
