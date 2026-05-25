const dayjs = require('dayjs');

const { StockAdjustment, Transaction } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// Profit Margin Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overall profit margin summary for a date range.
 * Covers: total revenue, total cost of goods sold, gross profit, margin %.
 * Also calculates losses from stock adjustments (damage, expiry, theft).
 *
 * @param {string} from - 'YYYY-MM-DD'
 * @param {string} to   - 'YYYY-MM-DD'
 */
const getProfitSummary = async (from, to) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const baseMatch = {
    saleDate: { $gte: start, $lte: end },
    status: 'completed',
  };

  // Inline profit expression
  const profitExpr = {
    $reduce: {
      input: '$items',
      initialValue: 0,
      in: {
        $add: [
          '$$value',
          {
            $multiply: [{ $subtract: ['$$this.unitPrice', '$$this.buyingPrice'] }, '$$this.qty'],
          },
        ],
      },
    },
  };

  const cogsExpr = {
    $reduce: {
      input: '$items',
      initialValue: 0,
      in: {
        $add: ['$$value', { $multiply: ['$$this.buyingPrice', '$$this.qty'] }],
      },
    },
  };

  const [salesAgg, lossesAgg] = await Promise.all([
    // ── Sales profit ──────────────────────────────────────────────────────
    Transaction.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCOGS: { $sum: cogsExpr },
          grossProfit: { $sum: profitExpr },
          transactions: { $sum: 1 },
          totalDiscount: { $sum: '$discount' },
          unitsSold: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.qty'] },
              },
            },
          },
        },
      },
    ]),

    // ── Stock losses (damage, expiry, theft) ──────────────────────────────
    StockAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          type: 'subtract',
          reason: { $in: ['damage', 'expiry', 'theft'] },
        },
      },
      {
        $group: {
          _id: '$reason',
          totalLoss: { $sum: { $abs: '$totalCostImpact' } },
          totalUnits: { $sum: '$qty' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const sales = salesAgg[0] ?? {
    totalRevenue: 0,
    totalCOGS: 0,
    grossProfit: 0,
    transactions: 0,
    totalDiscount: 0,
    unitsSold: 0,
  };

  const totalLosses = lossesAgg.reduce((s, l) => s + l.totalLoss, 0);
  const netProfit = sales.grossProfit - totalLosses;

  const grossMarginPct = sales.totalRevenue > 0 ? Number(((sales.grossProfit / sales.totalRevenue) * 100).toFixed(2)) : 0;

  const netMarginPct = sales.totalRevenue > 0 ? Number(((netProfit / sales.totalRevenue) * 100).toFixed(2)) : 0;

  return {
    period: { from, to },
    revenue: {
      total: sales.totalRevenue,
      discount: sales.totalDiscount,
    },
    cogs: {
      total: sales.totalCOGS,
    },
    profit: {
      gross: sales.grossProfit,
      grossMarginPct,
      losses: totalLosses,
      lossesByReason: lossesAgg,
      net: netProfit,
      netMarginPct,
    },
    transactions: sales.transactions,
    unitsSold: sales.unitsSold,
  };
};

/**
 * Per-product profit margin report.
 * Shows margin %, revenue, profit, units sold per product for a date range.
 * Useful for finding your most and least profitable products.
 *
 * @param {string}  from
 * @param {string}  to
 * @param {Object}  options - { page, limit, sortBy, sortOrder }
 */
const getProductProfitMargins = async (from, to, options = {}) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const {
    page = 1,
    limit = 20,
    sortBy = 'grossProfit', // 'grossProfit' | 'revenue' | 'marginPct' | 'unitsSold'
    sortOrder = 'desc',
  } = options;

  const skip = (Number(page) - 1) * Number(limit);

  const pipeline = [
    {
      $match: {
        saleDate: { $gte: start, $lte: end },
        status: 'completed',
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.productName' },
        sku: { $first: '$items.sku' },
        unitsSold: { $sum: '$items.qty' },
        revenue: { $sum: '$items.totalPrice' },
        cogs: {
          $sum: { $multiply: ['$items.buyingPrice', '$items.qty'] },
        },
        grossProfit: {
          $sum: {
            $multiply: [{ $subtract: ['$items.unitPrice', '$items.buyingPrice'] }, '$items.qty'],
          },
        },
        // Track unique selling prices (detects if price changed during period)
        avgUnitPrice: { $avg: '$items.unitPrice' },
        avgBuyingPrice: { $avg: '$items.buyingPrice' },
      },
    },
    {
      $addFields: {
        marginPct: {
          $cond: [
            { $gt: ['$revenue', 0] },
            {
              $multiply: [{ $divide: ['$grossProfit', '$revenue'] }, 100],
            },
            0,
          ],
        },
      },
    },
    { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
  ];

  // Count total distinct products for pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline = [...pipeline, { $skip: skip }, { $limit: Number(limit) }];

  const [data, countResult] = await Promise.all([Transaction.aggregate(dataPipeline), Transaction.aggregate(countPipeline)]);

  const total = countResult[0]?.total ?? 0;

  // Round marginPct for clean display
  const results = data.map((p) => ({
    ...p,
    marginPct: Number(p.marginPct.toFixed(1)),
  }));

  return {
    period: { from, to },
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
};

/**
 * Profit trend — daily gross profit for a date range.
 * Used for the profit line chart in reports.
 *
 * @param {string} from
 * @param {string} to
 */
const getProfitTrend = async (from, to) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const data = await Transaction.aggregate([
    {
      $match: {
        saleDate: { $gte: start, $lte: end },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$saleDate' },
        },
        revenue: { $sum: '$totalAmount' },
        grossProfit: {
          $sum: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $multiply: [{ $subtract: ['$$this.unitPrice', '$$this.buyingPrice'] }, '$$this.qty'],
                  },
                ],
              },
            },
          },
        },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Fill in missing dates with zeros for consistent chart data
  const dataMap = {};
  data.forEach((d) => {
    dataMap[d._id] = d;
  });

  const days = [];
  let cursor = dayjs(from);
  const endDay = dayjs(to);

  while (cursor.isBefore(endDay, 'day') || cursor.isSame(endDay, 'day')) {
    const dateStr = cursor.format('YYYY-MM-DD');
    days.push({
      date: dateStr,
      revenue: dataMap[dateStr]?.revenue ?? 0,
      grossProfit: dataMap[dateStr]?.grossProfit ?? 0,
      transactions: dataMap[dateStr]?.transactions ?? 0,
      marginPct:
        dataMap[dateStr]?.revenue > 0
          ? Number(((dataMap[dateStr].grossProfit / dataMap[dateStr].revenue) * 100).toFixed(1))
          : 0,
    });
    cursor = cursor.add(1, 'day');
  }

  return { period: { from, to }, trend: days };
};

/**
 * Stock loss summary — total losses from damage, expiry, theft for a period.
 * Used to understand shrinkage impact on profitability.
 *
 * @param {string} from
 * @param {string} to
 */
const getStockLossSummary = async (from, to) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const [byReason, byProduct] = await Promise.all([
    // Losses grouped by reason
    StockAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          type: 'subtract',
          reason: { $in: ['damage', 'expiry', 'theft'] },
        },
      },
      {
        $group: {
          _id: '$reason',
          totalUnits: { $sum: '$qty' },
          totalLoss: { $sum: { $abs: '$totalCostImpact' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalLoss: -1 } },
    ]),

    // Top 10 products with most losses
    StockAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          type: 'subtract',
          reason: { $in: ['damage', 'expiry', 'theft'] },
        },
      },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          sku: { $first: '$sku' },
          totalUnits: { $sum: '$qty' },
          totalLoss: { $sum: { $abs: '$totalCostImpact' } },
        },
      },
      { $sort: { totalLoss: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalLoss = byReason.reduce((s, r) => s + r.totalLoss, 0);

  return {
    period: { from, to },
    totalLoss,
    byReason,
    topLossProducts: byProduct,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Profit margin tracking
  getProfitSummary,
  getProductProfitMargins,
  getProfitTrend,
  getStockLossSummary,
};
