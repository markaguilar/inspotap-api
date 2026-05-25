const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    // Snapshot — product name at time of adjustment
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: '',
      trim: true,
    },

    // 'add' = stock increases (restock, correction up)
    // 'subtract' = stock decreases (damage, expiry, theft, correction down)
    type: {
      type: String,
      enum: {
        values: ['add', 'subtract'],
        message: 'Type must be "add" or "subtract".',
      },
      required: true,
    },

    reason: {
      type: String,
      enum: {
        values: [
          'restock', // bought more stock
          'damage', // product physically damaged
          'expiry', // product expired
          'correction', // fixing a counting mistake
          'theft', // suspected theft / shrinkage
          'other', // anything else — use notes field
        ],
        message: 'Invalid reason.',
      },
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      min: [1, 'Adjustment quantity must be at least 1.'],
    },

    // Snapshots for audit trail
    qtyBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    qtyAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    // Cost impact (optional) —
    // For restocks: costPerUnit × qty = total cost added
    // For damage/expiry: costPerUnit × qty = loss amount
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCostImpact: {
      type: Number,
      default: 0,
      // Positive for restock (money spent), negative for losses
    },

    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Notes must be at most 300 characters.'],
    },

    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    adjustedByName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

stockAdjustmentSchema.index({ product: 1, createdAt: -1 }); // per-product history
stockAdjustmentSchema.index({ reason: 1, createdAt: -1 }); // filter by reason
stockAdjustmentSchema.index({ adjustedBy: 1, createdAt: -1 }); // filter by user
stockAdjustmentSchema.index({ createdAt: -1 }); // general date range

const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);

module.exports = StockAdjustment;
