const mongoose = require('mongoose');
const httpStatus = require('http-status');
const dayjs = require('dayjs');

const { Product, Transaction } = require('../models');

const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const auditLogService = require('./auditLog.service');

// ── Constants ─────────────────────────────────────────────────────────────────

const VOID_RATE_THRESHOLD = 3;

// ── Private helpers ───────────────────────────────────────────────────────────

const generateReceiptNo = async (saleDate) => {
  const dateStr = dayjs(saleDate).format('YYYYMMDD');
  const startOfDay = dayjs(saleDate).startOf('day').toDate();
  const endOfDay = dayjs(saleDate).endOf('day').toDate();

  const count = await Transaction.countDocuments({
    saleDate: { $gte: startOfDay, $lte: endOfDay },
  });

  return `TXN-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

const buildItems = async (cartItems, skipStockCheck = false, allowOverride = false) => {
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

    if (!skipStockCheck && product.stockQty < item.qty) {
      // eslint-disable-next-line no-useless-concat
      errors.push(`Insufficient stock for "${product.name}". ` + `Available: ${product.stockQty}, requested: ${item.qty}.`);
      return;
    }

    const unitPrice = allowOverride && item.overridePrice != null ? item.overridePrice : product.sellingPrice;

    enriched.push({
      product: product._id,
      productName: product.name,
      sku: product.sku || '',
      unit: product.unit,
      qty: item.qty,
      unitPrice,
      buyingPrice: product.buyingPrice,
      totalPrice: unitPrice * item.qty,
    });
  });

  if (errors.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, errors.join(' | '));
  }

  return enriched;
};

const deductStock = (items, session) =>
  Promise.all(
    items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stockQty: -item.qty } }, { session, new: true }))
  );

const restoreStock = (items, session) =>
  Promise.all(
    items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stockQty: item.qty } }, { session, new: true }))
  );

const emitStockUpdate = (io, enriched, updatedProducts) => {
  if (!io) return;
  io.emit('stock:updated', {
    items: enriched.map((i) => ({
      product: i.product,
      stockQty: updatedProducts.find((p) => p && p._id.toString() === i.product.toString())?.stockQty ?? null,
    })),
  });
};

const checkAndEmitLowStock = (io, updatedProducts, performedBy, req) => {
  if (!io) return;

  const lowStockItems = updatedProducts.filter((p) => p && p.stockQty <= p.lowStockThreshold);

  if (!lowStockItems.length) return;

  io.emit('stock:low', {
    products: lowStockItems.map((p) => ({
      _id: p._id,
      name: p.name,
      stockQty: p.stockQty,
    })),
  });

  lowStockItems.forEach((p) => {
    auditLogService.log({
      performedBy,
      action: 'LOW_STOCK_ALERT',
      targetModel: 'Product',
      targetId: p._id,
      after: {
        name: p.name,
        stockQty: p.stockQty,
        lowStockThreshold: p.lowStockThreshold,
      },
      req,
    });
  });
};

// ── checkout ──────────────────────────────────────────────────────────────────

const checkout = async (body, cashier, io = null, req = null) => {
  const { items: cartItems, discount = 0, cashTendered, paymentMethod = 'cash', notes = '' } = body;

  const enriched = await buildItems(cartItems, false, false);
  const subtotal = enriched.reduce((s, i) => s + i.totalPrice, 0);
  const totalAmount = subtotal - discount;
  const change = Math.max(0, cashTendered - totalAmount);
  const saleDate = new Date();
  const receiptNo = await generateReceiptNo(saleDate);

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

    auditLogService.log({
      performedBy: cashier,
      action: 'CHECKOUT',
      targetModel: 'Transaction',
      targetId: txn._id,
      after: {
        receiptNo: txn.receiptNo,
        totalAmount: txn.totalAmount,
        itemCount: txn.items.length,
        paymentMethod,
      },
      req,
    });

    emitStockUpdate(io, enriched, updatedProducts);
    checkAndEmitLowStock(io, updatedProducts, cashier, req);

    return txn;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ── manualEntry ───────────────────────────────────────────────────────────────

const manualEntry = async (body, owner, io = null, req = null) => {
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

    let updatedProducts = [];
    if (!skipStockCheck) {
      updatedProducts = await deductStock(enriched, session);
    }

    await session.commitTransaction();

    if (!skipStockCheck) {
      emitStockUpdate(io, enriched, updatedProducts);
    }

    auditLogService.log({
      performedBy: owner,
      action: 'MANUAL_ENTRY',
      targetModel: 'Transaction',
      targetId: txn._id,
      after: {
        receiptNo,
        soldBy,
        saleDate: txn.saleDate,
        totalAmount: txn.totalAmount,
        itemCount: txn.items.length,
        skipStockCheck,
      },
      req,
    });

    return txn;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// ── queryTransactions ─────────────────────────────────────────────────────────

const queryTransactions = async (filter = {}, options = {}, requestingUser) => {
  const { page = 1, limit = 20, sortBy = 'saleDate', sortOrder = 'desc' } = options;

  const query = {};

  if (requestingUser && requestingUser.role === 'cashier') {
    query.cashier = requestingUser._id;
  } else if (filter.cashier) {
    query.cashier = filter.cashier;
  }

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
  if (filter.soldBy) query.soldBy = { $regex: filter.soldBy, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
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
    pages: Math.ceil(total / Number(limit)),
  };
};

// ── getTransactionById ────────────────────────────────────────────────────────

const getTransactionById = async (id) => {
  const txn = await Transaction.findById(id).populate('cashier', 'name email role');
  if (!txn) throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
  return txn;
};

// ── voidTransaction ───────────────────────────────────────────────────────────

const voidTransaction = async (id, reason, owner, io = null, req = null) => {
  const txn = await getTransactionById(id);

  if (txn.status !== 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, `Cannot void a transaction with status "${txn.status}".`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedProducts = await restoreStock(txn.items, session);

    const beforeSnapshot = {
      status: txn.status,
      totalAmount: txn.totalAmount,
    };

    txn.status = 'voided';
    txn.voidedAt = new Date();
    txn.voidedBy = owner._id;
    txn.voidReason = reason;
    await txn.save({ session });

    await session.commitTransaction();

    auditLogService.log({
      performedBy: owner,
      action: 'TRANSACTION_VOIDED',
      targetModel: 'Transaction',
      targetId: txn._id,
      before: beforeSnapshot,
      after: {
        status: 'voided',
        voidReason: reason,
        voidedAt: txn.voidedAt,
        receiptNo: txn.receiptNo,
        totalAmount: txn.totalAmount,
      },
      req,
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayVoids = await Transaction.countDocuments({
      cashier: txn.cashier,
      saleDate: { $gte: startOfDay },
      status: 'voided',
    });

    if (todayVoids > VOID_RATE_THRESHOLD) {
      if (io) {
        io.emit('alert:void_rate', {
          cashierId: txn.cashier,
          voidCount: todayVoids,
          threshold: VOID_RATE_THRESHOLD,
        });
      }

      auditLogService.log({
        performedBy: owner,
        action: 'VOID_RATE_ALERT',
        targetModel: 'Transaction',
        targetId: txn._id,
        metadata: {
          cashierId: txn.cashier,
          soldBy: txn.soldBy,
          todayVoidCount: todayVoids,
          threshold: VOID_RATE_THRESHOLD,
        },
        req,
      });

      logger.warn(`[VoidRateAlert] Cashier ${txn.soldBy} has voided ${todayVoids} transactions today`);
    }

    emitStockUpdate(io, txn.items, updatedProducts);

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
