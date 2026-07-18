const mongoose = require('mongoose');
const httpStatus = require('http-status');
const dayjs = require('dayjs');

const ApiError = require('../utils/ApiError');

const auditLogService = require('./auditLog.service');

const { Product, StockAdjustment, Supplier, PurchaseOrder } = require('../models');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generatePoNumber = async (purchasedAt) => {
  const dateStr = dayjs(purchasedAt).format('YYYYMMDD');
  const startOfDay = dayjs(purchasedAt).startOf('day').toDate();
  const endOfDay = dayjs(purchasedAt).endOf('day').toDate();

  const count = await PurchaseOrder.countDocuments({
    purchasedAt: { $gte: startOfDay, $lte: endOfDay },
  });

  return `PO-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Fetch products, validate they exist, and build enriched item snapshots.
 */
const buildItems = async (cartItems) => {
  const productIds = cartItems.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });

  const productMap = products.reduce((acc, p) => {
    acc[p._id.toString()] = p;
    return acc;
  }, {});

  const errors = [];
  const enriched = [];

  cartItems.forEach((item) => {
    const product = productMap[item.product];
    if (!product) {
      errors.push(`Product not found: ${item.product}`);
      return;
    }
    enriched.push({
      product: product._id,
      productName: product.name,
      sku: product.sku || '',
      unit: product.unit,
      qty: item.qty,
      costPerUnit: item.costPerUnit,
      totalCost: item.costPerUnit * item.qty,
    });
  });

  if (errors.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, errors.join(' | '));
  }

  return enriched;
};

/**
 * Add stock to products and create StockAdjustment records.
 * Runs inside a MongoDB session for atomicity.
 */
const addStockFromPurchase = async (items, poId, performedBy, session) => {
  const ops = items.map(async (item) => {
    const updated = await Product.findByIdAndUpdate(item.product, { $inc: { stockQty: item.qty } }, { session, new: true });

    // Update buying price if it changed
    if (updated && updated.buyingPrice !== item.costPerUnit && item.costPerUnit > 0) {
      await Product.findByIdAndUpdate(item.product, { buyingPrice: item.costPerUnit }, { session });
    }

    // Create audit trail for each item
    await StockAdjustment.create(
      [
        {
          product: item.product,
          productName: item.productName,
          sku: item.sku,
          type: 'add',
          reason: 'restock',
          qty: item.qty,
          qtyBefore: updated ? updated.stockQty - item.qty : 0,
          qtyAfter: updated ? updated.stockQty : item.qty,
          costPerUnit: item.costPerUnit,
          totalCostImpact: item.totalCost,
          notes: `Purchase Order: ${poId}`,
          adjustedBy: performedBy._id,
          adjustedByName: performedBy.name,
        },
      ],
      { session }
    );

    return updated;
  });

  return Promise.all(ops);
};

// ── createPurchaseOrder ───────────────────────────────────────────────────────

/**
 * Create a purchase order.
 * If status is 'received', stock is added immediately.
 * If status is 'pending', stock is NOT added yet (waits for receive).
 */
const createPurchaseOrder = async (body, performedBy, io = null, req = null) => {
  const {
    supplier: supplierId,
    items: cartItems,
    status = 'received',
    purchasedAt = new Date(),
    paymentMethod = 'cash',
    amountPaid = 0,
    notes = '',
  } = body;

  // Validate supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found.');

  const enriched = await buildItems(cartItems);
  const totalCost = enriched.reduce((s, i) => s + i.totalCost, 0);
  const poNumber = await generatePoNumber(purchasedAt);

  // Validate amountPaid doesn't exceed total
  if (amountPaid > totalCost) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Amount paid (₱${amountPaid}) cannot exceed total cost (₱${totalCost}).`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [po] = await PurchaseOrder.create(
      [
        {
          poNumber,
          supplier: supplier._id,
          supplierName: supplier.name,
          items: enriched,
          totalCost,
          status,
          purchasedAt: new Date(purchasedAt),
          receivedAt: status === 'received' ? new Date() : null,
          paymentMethod,
          amountPaid,
          recordedBy: performedBy._id,
          recordedByName: performedBy.name,
          notes,
        },
      ],
      { session }
    );

    // Add stock immediately if already received
    if (status === 'received') {
      await addStockFromPurchase(enriched, po._id, performedBy, session);
    }

    await session.commitTransaction();

    // Real-time stock update to open POS tabs
    if (io && status === 'received') {
      io.emit('stock:updated', {
        items: enriched.map((i) => ({ product: i.product, qty: i.qty })),
      });
    }

    auditLogService.log({
      performedBy,
      action: status === 'received' ? 'STOCK_ADJUSTED' : 'STOCK_ADJUSTED',
      targetModel: 'Product',
      targetId: po._id,
      after: {
        poNumber,
        supplierName: supplier.name,
        totalCost,
        itemCount: enriched.length,
        status,
      },
      req,
    });

    return po;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ── receivePurchaseOrder ──────────────────────────────────────────────────────

/**
 * Mark a pending purchase order as received.
 * This is when stock actually gets added.
 */
const receivePurchaseOrder = async (id, body, performedBy, io = null, req = null) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found.');

  if (po.status === 'received') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This order has already been received.');
  }
  if (po.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot receive a cancelled order.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await addStockFromPurchase(po.items, po._id, performedBy, session);

    po.status = 'received';
    po.receivedAt = new Date();
    if (body.amountPaid !== undefined) po.amountPaid = body.amountPaid;
    if (body.notes) po.notes = body.notes;
    await po.save({ session });

    await session.commitTransaction();

    if (io) {
      io.emit('stock:updated', {
        items: po.items.map((i) => ({ product: i.product, qty: i.qty })),
      });
    }

    auditLogService.log({
      performedBy,
      action: 'STOCK_ADJUSTED',
      targetModel: 'Product',
      targetId: po._id,
      before: { status: 'pending' },
      after: { status: 'received', receivedAt: po.receivedAt },
      req,
    });

    return po;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ── cancelPurchaseOrder ───────────────────────────────────────────────────────

const cancelPurchaseOrder = async (id, reason, performedBy, req = null) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found.');

  if (po.status === 'received') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot cancel a received order. Use stock adjustment to correct stock instead.'
    );
  }
  if (po.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order is already cancelled.');
  }

  po.status = 'cancelled';
  po.notes = po.notes ? `${po.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`;
  await po.save();

  auditLogService.log({
    performedBy,
    action: 'STOCK_ADJUSTED',
    targetModel: 'Product',
    targetId: po._id,
    before: { status: po.status },
    after: { status: 'cancelled', reason },
    req,
  });

  return po;
};

// ── queryPurchaseOrders ───────────────────────────────────────────────────────

const queryPurchaseOrders = async (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sortBy = 'purchasedAt', sortOrder = 'desc' } = options;

  const query = {};

  if (filter.supplier) query.supplier = filter.supplier;
  if (filter.status) query.status = filter.status;
  if (filter.paymentMethod) query.paymentMethod = filter.paymentMethod;
  if (filter.recordedBy) query.recordedBy = filter.recordedBy;

  if (filter.from || filter.to) {
    query.purchasedAt = {};
    if (filter.from) query.purchasedAt.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.purchasedAt.$lte = to;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    PurchaseOrder.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('supplier', 'name phone')
      .populate('recordedBy', 'name'),
    PurchaseOrder.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
};

// ── getPurchaseOrderById ──────────────────────────────────────────────────────

const getPurchaseOrderById = async (id) => {
  const po = await PurchaseOrder.findById(id)
    .populate('supplier', 'name phone email address')
    .populate('recordedBy', 'name email');

  if (!po) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found.');
  return po;
};

// ── getPurchaseSummary ────────────────────────────────────────────────────────

/**
 * Purchase cost summary for a date range.
 * Used in reports to show how much was spent on restocking.
 */
const getPurchaseSummary = async (from, to) => {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const [summary, bySupplier, byPaymentMethod] = await Promise.all([
    PurchaseOrder.aggregate([
      {
        $match: {
          purchasedAt: { $gte: start, $lte: end },
          status: { $in: ['received', 'partial'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$totalCost' },
          totalPaid: { $sum: '$amountPaid' },
          orderCount: { $sum: 1 },
        },
      },
    ]),

    // Spending per supplier
    PurchaseOrder.aggregate([
      {
        $match: {
          purchasedAt: { $gte: start, $lte: end },
          status: { $in: ['received', 'partial'] },
        },
      },
      {
        $group: {
          _id: '$supplier',
          supplierName: { $first: '$supplierName' },
          totalSpent: { $sum: '$totalCost' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]),

    // By payment method
    PurchaseOrder.aggregate([
      {
        $match: {
          purchasedAt: { $gte: start, $lte: end },
          status: { $in: ['received', 'partial'] },
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalSpent: { $sum: '$totalCost' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
    ]),
  ]);

  const totals = summary[0] ?? { totalSpent: 0, totalPaid: 0, orderCount: 0 };
  const totalOwed = totals.totalSpent - totals.totalPaid;

  return {
    period: { from, to },
    totalSpent: totals.totalSpent,
    totalPaid: totals.totalPaid,
    totalOwed,
    orderCount: totals.orderCount,
    bySupplier,
    byPaymentMethod,
  };
};

module.exports = {
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  queryPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseSummary,
};
