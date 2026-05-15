const mongoose = require('mongoose');

const shiftSchema = mongoose.Schema(
  {
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cashierName: { type: String, required: true }, // snapshot

    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },

    // ── Opening ───────────────────────────────────────────────────────────
    openedAt: { type: Date, default: Date.now },
    openingCash: {
      type: Number,
      required: true,
      min: 0,
      // Declared cash in the drawer at shift start
    },

    // ── Closing ───────────────────────────────────────────────────────────
    closedAt: { type: Date, default: null },
    closingCash: {
      type: Number,
      default: null,
      // Physically counted cash at shift end
    },

    // ── Computed on close ─────────────────────────────────────────────────
    totalSales: { type: Number, default: 0 }, // sum of all completed txn totals
    totalTransactions: { type: Number, default: 0 }, // count of completed txns
    totalCashSales: { type: Number, default: 0 }, // cash payment only
    totalGcashSales: { type: Number, default: 0 },
    totalMayaSales: { type: Number, default: 0 },
    totalVoids: { type: Number, default: 0 },

    // Expected cash = openingCash + totalCashSales
    expectedCash: { type: Number, default: null },

    // Variance = closingCash - expectedCash
    // Positive = overage, Negative = shortage
    cashVariance: { type: Number, default: null },

    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Only one open shift per cashier at a time
shiftSchema.index({ cashier: 1, status: 1 });
shiftSchema.index({ openedAt: -1 });

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
