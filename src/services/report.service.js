const dayjs = require('dayjs');

const { Transaction, Product } = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns start and end of a given date as Date objects.
 * @param {string|Date} date - 'YYYY-MM-DD' or Date object
 */
const dayBounds = (date) => ({
  start: dayjs(date).startOf('day').toDate(),
  end: dayjs(date).endOf('day').toDate(),
});

/**
 * Base match stage for completed transactions in a date range.
 * Always uses saleDate — never createdAt.
 */
const completedInRange = (start, end) => ({
  saleDate: { $gte: start, $lte: end },
  status: 'completed',
});

/**
 * Inline profit expression reused across aggregation pipelines.
 * Profit per item = (unitPrice - buyingPrice) × qty
 */
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

/**
 * Total units sold expression (sum of all item.qty in a transaction).
 */
const totalUnitsExpr = {
  $reduce: {
    input: '$items',
    initialValue: 0,
    in: { $add: ['$$value', '$$this.qty'] },
  },
};

// ── getSummary ─────────────────────────────────────────────────────────────────

/**
 * Today's at-a-glance snapshot — used by the dashboard cards.
 * Runs fast: one aggregation + one Product query.
 *
 * @returns {Promise<Object>}
 */
const getSummary = async () => {
  const today = new Date();
  const { start, end } = dayBounds(today);

  const [agg, lowStockProducts] = await Promise.all([
    Transaction.aggregate([
      { $match: completedInRange(start, end) },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          totalDiscount: { $sum: '$discount' },
          totalProfit: { $sum: profitExpr },
          totalUnitsSold: { $sum: totalUnitsExpr },
          manualEntryCount: {
            $sum: { $cond: [{ $eq: ['$source', 'manual_entry'] }, 1, 0] },
          },
          posCount: {
            $sum: { $cond: [{ $eq: ['$source', 'pos'] }, 1, 0] },
          },
          cashSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0] },
          },
          gcashSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'gcash'] }, '$totalAmount', 0] },
          },
          mayaSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'maya'] }, '$totalAmount', 0] },
          },
          utangTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'utang'] }, '$totalAmount', 0] },
          },
        },
      },
    ]),

    Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQty', '$lowStockThreshold'] },
    })
      .select('name stockQty lowStockThreshold unit')
      .sort({ stockQty: 1 })
      .limit(20)
      .lean(),
  ]);

  const summary = agg[0] ?? {
    totalRevenue: 0,
    totalTransactions: 0,
    totalDiscount: 0,
    totalProfit: 0,
    totalUnitsSold: 0,
    manualEntryCount: 0,
    posCount: 0,
    cashSales: 0,
    gcashSales: 0,
    mayaSales: 0,
    utangTotal: 0,
  };

  const avgTransactionValue = summary.totalTransactions > 0 ? summary.totalRevenue / summary.totalTransactions : 0;

  return {
    date: dayjs(today).format('YYYY-MM-DD'),
    ...summary,
    avgTransactionValue,
    lowStockProducts,
    lowStockCount: lowStockProducts.length,
  };
};

// ── getDaily ───────────────────────────────────────────────────────────────────

/**
 * Full daily report for any given date.
 * Includes all breakdowns and top product lists.
 *
 * @param {string}  date          - 'YYYY-MM-DD'
 * @param {boolean} includeManual - include manual_entry transactions (default true)
 * @returns {Promise<Object>}
 */
const getDaily = async (date, includeManual = true) => {
  const { start, end } = dayBounds(date);

  const baseMatch = { ...completedInRange(start, end) };
  if (!includeManual) baseMatch.source = 'pos';

  const [summary, byPaymentMethod, bySource, bySeller, byHour, topByRevenue, topByUnits, topByProfit, voidSummary] =
    await Promise.all([
      // ── Overall totals ──────────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            transactions: { $sum: 1 },
            discount: { $sum: '$discount' },
            profit: { $sum: profitExpr },
            unitsSold: { $sum: totalUnitsExpr },
            manualEntryCount: { $sum: { $cond: [{ $eq: ['$source', 'manual_entry'] }, 1, 0] } },
            posCount: { $sum: { $cond: [{ $eq: ['$source', 'pos'] }, 1, 0] } },
          },
        },
      ]),

      // ── By payment method ───────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$paymentMethod',
            revenue: { $sum: '$totalAmount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // ── By source ───────────────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$source',
            revenue: { $sum: '$totalAmount' },
            transactions: { $sum: 1 },
          },
        },
      ]),

      // ── By seller (soldBy) ──────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$soldBy',
            revenue: { $sum: '$totalAmount' },
            profit: { $sum: profitExpr },
            transactions: { $sum: 1 },
            manualCount: { $sum: { $cond: [{ $eq: ['$source', 'manual_entry'] }, 1, 0] } },
            posCount: { $sum: { $cond: [{ $eq: ['$source', 'pos'] }, 1, 0] } },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // ── By hour (peak hours) ────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { $hour: '$saleDate' },
            revenue: { $sum: '$totalAmount' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // ── Top 10 products by revenue ──────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            revenue: { $sum: '$items.totalPrice' },
            unitsSold: { $sum: '$items.qty' },
            profit: {
              $sum: {
                $multiply: [{ $subtract: ['$items.unitPrice', '$items.buyingPrice'] }, '$items.qty'],
              },
            },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),

      // ── Top 10 by units sold ────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            unitsSold: { $sum: '$items.qty' },
            revenue: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 10 },
      ]),

      // ── Top 10 by profit ────────────────────────────────────────────────────
      Transaction.aggregate([
        { $match: baseMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.productName' },
            profit: {
              $sum: {
                $multiply: [{ $subtract: ['$items.unitPrice', '$items.buyingPrice'] }, '$items.qty'],
              },
            },
            revenue: { $sum: '$items.totalPrice' },
            unitsSold: { $sum: '$items.qty' },
          },
        },
        { $sort: { profit: -1 } },
        { $limit: 10 },
      ]),

      // ── Voided transactions summary ─────────────────────────────────────────
      Transaction.aggregate([
        {
          $match: {
            saleDate: { $gte: start, $lte: end },
            status: 'voided',
          },
        },
        {
          $group: {
            _id: null,
            voidCount: { $sum: 1 },
            voidedAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

  const totals = summary[0] ?? {
    revenue: 0,
    transactions: 0,
    discount: 0,
    profit: 0,
    unitsSold: 0,
    manualEntryCount: 0,
    posCount: 0,
  };

  const avgTransactionValue = totals.transactions > 0 ? totals.revenue / totals.transactions : 0;

  // Fill in missing hours with 0 so the chart has all 24 data points
  const hourlyMap = {};
  byHour.forEach((h) => {
    hourlyMap[h._id] = h;
  });
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    revenue: hourlyMap[hour]?.revenue ?? 0,
    transactions: hourlyMap[hour]?.transactions ?? 0,
  }));

  return {
    date,
    includeManual,
    summary: {
      ...totals,
      avgTransactionValue,
    },
    byPaymentMethod,
    bySource,
    bySeller,
    hourly,
    topProducts: {
      byRevenue: topByRevenue,
      byUnits: topByUnits,
      byProfit: topByProfit,
    },
    voids: voidSummary[0] ?? { voidCount: 0, voidedAmount: 0 },
  };
};

// ── getDailyComparison ─────────────────────────────────────────────────────────

/**
 * Compare today (or any date) against yesterday and the same weekday last week.
 * Powers the "vs yesterday" badges on the dashboard.
 *
 * @param {string} date - 'YYYY-MM-DD' (defaults to today)
 * @returns {Promise<Object>}
 */
const getDailyComparison = async (date) => {
  const target = dayjs(date);
  const yesterday = target.subtract(1, 'day');
  const lastWeek = target.subtract(7, 'day');

  const fetchDayTotals = async (d) => {
    const { start, end } = dayBounds(d);
    const [agg] = await Transaction.aggregate([
      { $match: completedInRange(start, end) },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          profit: { $sum: profitExpr },
          transactions: { $sum: 1 },
        },
      },
    ]);
    return agg ?? { revenue: 0, profit: 0, transactions: 0 };
  };

  const pctChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  const [current, prev, prevWeek] = await Promise.all([
    fetchDayTotals(target),
    fetchDayTotals(yesterday),
    fetchDayTotals(lastWeek),
  ]);

  return {
    date: target.format('YYYY-MM-DD'),
    today: current,
    vsYesterday: {
      date: yesterday.format('YYYY-MM-DD'),
      ...prev,
      revenueChange: pctChange(current.revenue, prev.revenue),
      profitChange: pctChange(current.profit, prev.profit),
      transactionChange: pctChange(current.transactions, prev.transactions),
    },
    vsSameWeekday: {
      date: lastWeek.format('YYYY-MM-DD'),
      ...prevWeek,
      revenueChange: pctChange(current.revenue, prevWeek.revenue),
      profitChange: pctChange(current.profit, prevWeek.profit),
      transactionChange: pctChange(current.transactions, prevWeek.transactions),
    },
  };
};

// ── getSellers ─────────────────────────────────────────────────────────────────

/**
 * Revenue breakdown per soldBy name for a date range.
 * Powers the "Nanay sold ₱850 today" widget.
 *
 * @param {string} from - 'YYYY-MM-DD'
 * @param {string} to   - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
const getSellers = async (from, to) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  return Transaction.aggregate([
    { $match: completedInRange(start, end) },
    {
      $group: {
        _id: '$soldBy',
        revenue: { $sum: '$totalAmount' },
        profit: { $sum: profitExpr },
        transactions: { $sum: 1 },
        unitsSold: { $sum: totalUnitsExpr },
        manualCount: { $sum: { $cond: [{ $eq: ['$source', 'manual_entry'] }, 1, 0] } },
        posCount: { $sum: { $cond: [{ $eq: ['$source', 'pos'] }, 1, 0] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
};

// ── getUtangSummary ────────────────────────────────────────────────────────────

/**
 * Outstanding utang (credit) summary.
 * Total issued vs total that remains unpaid (no payment tracking yet in Phase 1).
 *
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Promise<Object>}
 */
const getUtangSummary = async (date) => {
  const { start, end } = dayBounds(date);

  const [todayUtang, allTimeUtang] = await Promise.all([
    // Utang issued today
    Transaction.aggregate([
      {
        $match: {
          saleDate: { $gte: start, $lte: end },
          status: 'completed',
          paymentMethod: 'utang',
        },
      },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: '$totalAmount' },
          transactions: { $sum: 1 },
        },
      },
    ]),

    // All-time outstanding utang (completed, not voided)
    Transaction.aggregate([
      { $match: { status: 'completed', paymentMethod: 'utang' } },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$totalAmount' },
          transactions: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    today: todayUtang[0] ?? { totalIssued: 0, transactions: 0 },
    allTime: allTimeUtang[0] ?? { totalOutstanding: 0, transactions: 0 },
  };
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  getSummary,
  getDaily,
  getDailyComparison,
  getSellers,
  getUtangSummary,
};
