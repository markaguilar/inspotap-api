const mongoose = require('mongoose');
const httpStatus = require('http-status');
const dayjs = require('dayjs');

const { Product, Transaction } = require('../models');

const ApiError = require('../utils/ApiError');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate receipt number: TXN-YYYYMMDD-XXXX
 * Uses saleDate so backdated manual entries get the right date prefix.
 */
const generateReceiptNo = async (saleDate) => {
  const dateStr = dayjs(saleDate).format('YYYYMMDD');
  const startOfDay = dayjs(saleDate).startOf('day').toDate();
  const endOfDay = dayjs(saleDate).endOf('day').toDate();

  const count = await Transaction.countDocuments({
    saleDate: { $gte: startOfDay, $lte: endOfDay },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `TXN-${dateStr}-${seq}`;
};

/**
 * Fetch products, validate stock, build enriched item snapshots.
 * @param {Array}   cartItems       - [{ product, qty, overridePrice? }]
 * @param {boolean} skipStockCheck  - skip stock validation (manual entry override)
 * @param {boolean} allowOverride   - allow overridePrice (owner only)
 */
const buildItems = async (cartItems, skipStockCheck = false, allowOverride = false) => {
  const productIds = cartItems.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });

  const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

  const errors = [];

  const enriched = cartItems
    .map((item) => {
      const product = productMap[item.product];

      if (!product) {
        errors.push(`Product not found: ${item.product}`);
        return null;
      }

      if (!skipStockCheck && product.stockQty < item.qty) {
        errors.push(`Insufficient stock for "${product.name}". Available: ${product.stockQty}, requested: ${item.qty}.`);
        return null;
      }

      const unitPrice = allowOverride && item.overridePrice != null ? item.overridePrice : product.sellingPrice;

      return {
        product: product._id,
        productName: product.name,
        sku: product.sku || '',
        unit: product.unit,
        qty: item.qty,
        unitPrice,
        buyingPrice: product.buyingPrice,
        totalPrice: unitPrice * item.qty,
      };
    })
    .filter(Boolean);

  if (errors.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, errors.join(' | '));
  }

  return enriched;
};
/**
 * Deduct stock atomically using $inc inside a session.
 */
const deductStock = (items, session) => {
  return Promise.all(
    items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stockQty: -item.qty } }, { session, new: true }))
  );
};

/**
 * Restore stock (used on void).
 */
const restoreStock = (items, session) => {
  return Promise.all(
    items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stockQty: item.qty } }, { session, new: true }))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live POS checkout.
 * Validates stock → saves transaction → deducts stock (all in one MongoDB session).
 *
 * @param {Object} body    - validated checkout body
 * @param {Object} cashier - req.user from auth middleware
 * @param {Object} io      - socket.io instance (optional)
 */
const checkout = async (body, cashier, io = null) => {
  const { items: cartItems, discount = 0, cashTendered, paymentMethod = 'cash', notes = '' } = body;

  // Build enriched items — cashiers cannot override price
  const enriched = await buildItems(cartItems, false, false);
  const subtotal = enriched.reduce((s, i) => s + i.totalPrice, 0);
  const totalAmount = subtotal - discount;
  const change = Math.max(0, cashTendered - totalAmount);
  const saleDate = new Date();
  const receiptNo = await generateReceiptNo(saleDate);

  // Validate cash tendered covers the total
  if (paymentMethod === 'cash' && cashTendered < totalAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cash tendered (₱${cashTendered}) is less than total (₱${totalAmount}).`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [txn] = await Transaction.create(
      [
        {
          receiptNo,
          items: enriched,
          subtotal,
          discount,
          totalAmount,
          cashTendered,
          change,
          paymentMethod,
          source: 'pos',
          saleDate,
          soldBy: cashier.name,
          cashier: cashier._id,
          notes,
          status: 'completed',
        },
      ],
      { session }
    );

    const updatedProducts = await deductStock(enriched, session);
    await session.commitTransaction();

    // Real-time stock update to all connected clients
    if (io) {
      io.emit('stock:updated', {
        items: enriched.map((i) => ({
          product: i.product,
          stockQty: updatedProducts.find((p) => p._id.toString() === i.product.toString())?.stockQty ?? null,
        })),
      });

      // Alert if any product is now low stock
      const lowStockItems = updatedProducts.filter((p) => p && p.stockQty <= p.lowStockThreshold);
      if (lowStockItems.length) {
        io.emit('stock:low', {
          products: lowStockItems.map((p) => ({
            _id: p._id,
            name: p.name,
            stockQty: p.stockQty,
          })),
        });
      }
    }

    return txn;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Manual sale entry (backtrack or quick-tap).
 * Owner-only. Supports backdated saleDate and optional stock skip.
 */
const manualEntry = async (body, owner, io = null) => {
  const {
    items: cartItems,
    saleDate: saleDateRaw,
    soldBy,
    notes = '',
    discount = 0,
    paymentMethod = 'cash',
    skipStockCheck = false,
  } = body;

  const saleDate = saleDateRaw ? new Date(saleDateRaw) : new Date();

  // Owners can pass overridePrice per item
  const enriched = await buildItems(cartItems, skipStockCheck, true);
  const subtotal = enriched.reduce((s, i) => s + i.totalPrice, 0);
  const totalAmount = subtotal - discount;
  const receiptNo = await generateReceiptNo(saleDate);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [txn] = await Transaction.create(
      [
        {
          receiptNo,
          items: enriched,
          subtotal,
          discount,
          totalAmount,
          cashTendered: totalAmount,
          change: 0,
          paymentMethod,
          source: 'manual_entry',
          saleDate,
          soldBy,
          cashier: owner._id,
          notes,
          status: 'completed',
        },
      ],
      { session }
    );

    if (!skipStockCheck) {
      const updatedProducts = await deductStock(enriched, session);
      if (io) {
        io.emit('stock:updated', {
          items: enriched.map((i) => ({
            product: i.product,
            stockQty: updatedProducts.find((p) => p._id.toString() === i.product.toString())?.stockQty ?? null,
          })),
        });
      }
    }

    await session.commitTransaction();
    return txn;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Paginated transaction list with filters.
 */
const queryTransactions = async (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sortBy = 'saleDate', sortOrder = 'desc' } = options;

  const query = {};

  // Date range — always use saleDate, not createdAt
  if (filter.from || filter.to) {
    query.saleDate = {};
    if (filter.from) query.saleDate.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.saleDate.$lte = to;
    }
  }

  if (filter.source) query.source = filter.source;
  if (filter.status) query.status = filter.status;
  if (filter.paymentMethod) query.paymentMethod = filter.paymentMethod;
  if (filter.cashier) query.cashier = filter.cashier;

  if (filter.soldBy) {
    query.soldBy = { $regex: filter.soldBy, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    Transaction.find(query).sort(sort).skip(skip).limit(Number(limit)).populate('cashier', 'name email role'),
    Transaction.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
  };
};

/**
 * Get single transaction by ID.
 */
const getTransactionById = async (id) => {
  const txn = await Transaction.findById(id).populate('cashier', 'name email role');
  if (!txn) throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
  return txn;
};

/**
 * Void a transaction — owner only.
 * Marks as voided, restores stock, never deletes the record.
 */
const voidTransaction = async (id, reason, owner, io = null) => {
  const txn = await getTransactionById(id);

  if (txn.status !== 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot void a transaction with status "${txn.status}".`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedProducts = await restoreStock(txn.items, session);

    txn.status = 'voided';
    txn.voidedAt = new Date();
    txn.voidedBy = owner._id;
    txn.voidReason = reason;
    await txn.save({ session });

    await session.commitTransaction();

    if (io) {
      io.emit('stock:updated', {
        items: txn.items.map((i) => ({
          product: i.product,
          stockQty: updatedProducts.find((p) => p?._id.toString() === i.product.toString())?.stockQty ?? null,
        })),
      });
    }

    return txn;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  checkout,
  manualEntry,
  queryTransactions,
  getTransactionById,
  voidTransaction,
};
