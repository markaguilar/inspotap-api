const httpStatus = require('http-status');

const { Product, StockAdjustment } = require('../models');

const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const auditLogService = require('./auditLog.service');
const { productService } = require('./index');

// ─────────────────────────────────────────────────────────────────────────────
// Stock Adjustment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adjust stock for a product — creates an audit record and updates stockQty.
 *
 * @param {string} productId
 * @param {Object} body        - { type, reason, qty, costPerUnit, notes }
 * @param {Object} performedBy - req.user
 * @param {Object} req         - Express req (for audit log IP)
 */
const adjustStock = async (productId, body, performedBy, req = null) => {
  const product = await productService.getProductById(productId);

  const { type, reason, qty, costPerUnit = 0, notes = '' } = body;

  const delta = type === 'add' ? qty : -qty;
  const qtyBefore = product.stockQty;
  const qtyAfter = Math.max(0, qtyBefore + delta);

  // Warn if subtract would go below zero — clamp to 0
  if (type === 'subtract' && qtyBefore < qty) {
    logger.warn(`[StockAdjustment] Product "${product.name}" subtract ${qty} from ${qtyBefore} — clamped to 0`);
  }

  // Calculate cost impact
  // Restock = money spent (+), damage/expiry/theft = loss (-)
  const totalCostImpact =
    type === 'add'
      ? costPerUnit * qty // positive: cost of restocking
      : -(product.buyingPrice * qty); // negative: loss at buying price

  // Update product stock atomically
  product.stockQty = qtyAfter;
  await product.save();

  // Create adjustment record
  const adjustment = await StockAdjustment.create({
    product: product._id,
    productName: product.name,
    sku: product.sku || '',
    type,
    reason,
    qty,
    qtyBefore,
    qtyAfter,
    costPerUnit,
    totalCostImpact,
    notes,
    adjustedBy: performedBy._id,
    adjustedByName: performedBy.name,
  });

  // Audit log
  auditLogService.log({
    performedBy,
    action: 'STOCK_ADJUSTED',
    targetModel: 'Product',
    targetId: product._id,
    before: { stockQty: qtyBefore },
    after: { stockQty: qtyAfter, reason, type, qty },
    metadata: { adjustmentId: adjustment._id, costPerUnit, totalCostImpact },
    req,
  });

  return { adjustment, product };
};

/**
 * Paginated list of all stock adjustments — owner sees all.
 */
const queryAdjustments = async (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const query = {};

  if (filter.product) query.product = filter.product;
  if (filter.reason) query.reason = filter.reason;
  if (filter.type) query.type = filter.type;
  if (filter.adjustedBy) query.adjustedBy = filter.adjustedBy;

  if (filter.from || filter.to) {
    query.createdAt = {};
    if (filter.from) query.createdAt.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    StockAdjustment.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('product', 'name sku unit')
      .populate('adjustedBy', 'name email'),
    StockAdjustment.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
};

/**
 * Single adjustment by ID.
 */
const getAdjustmentById = async (id) => {
  const adjustment = await StockAdjustment.findById(id)
    .populate('product', 'name sku unit')
    .populate('adjustedBy', 'name email');

  if (!adjustment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock adjustment not found.');
  }

  return adjustment;
};

/**
 * All adjustments for a specific product — used in product detail view.
 */
const getProductAdjustments = async (productId, filter = {}, options = {}) => {
  const product = await Product.findById(productId).select('name sku stockQty');
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');

  const query = { product: productId };
  if (filter.reason) query.reason = filter.reason;
  if (filter.type) query.type = filter.type;

  if (filter.from || filter.to) {
    query.createdAt = {};
    if (filter.from) query.createdAt.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const { page = 1, limit = 20 } = options;
  const skip = (Number(page) - 1) * Number(limit);

  const [results, total] = await Promise.all([
    StockAdjustment.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('adjustedBy', 'name'),
    StockAdjustment.countDocuments(query),
  ]);

  return {
    product,
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Stock adjustments
  adjustStock,
  queryAdjustments,
  getAdjustmentById,
  getProductAdjustments,
};
