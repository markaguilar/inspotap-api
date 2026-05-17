const mongoose = require('mongoose');

// Embedded item — snapshot of product name + cost at time of purchase
const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      default: '',
    },
    qty: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1.'],
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: [0, 'Cost must be 0 or more.'],
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be 0 or more.'],
      // qty × costPerUnit — pre-computed and stored
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    // Auto-generated: PO-YYYYMMDD-XXXX
    poNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
      // Snapshot so history is preserved if supplier is renamed
    },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Purchase order must have at least one item.',
      },
    },

    totalCost: {
      type: Number,
      required: true,
      min: [0, 'Total cost must be 0 or more.'],
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'received', 'partial', 'cancelled'],
        message: 'Status must be: pending, received, partial, or cancelled.',
      },
      default: 'received',
      // Most sari-sari entries are immediate (bought and brought home)
      // pending = ordered but not yet delivered
    },

    // When the items were physically purchased/ordered
    // Backdatable — owner may record a purchase made yesterday
    purchasedAt: {
      type: Date,
      default: Date.now,
    },

    // When items were physically received (for pending → received flow)
    receivedAt: {
      type: Date,
      default: null,
    },

    // Who recorded the entry
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recordedByName: {
      type: String,
      default: '',
    },

    // Payment method used to pay the supplier
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'credit', 'cheque', 'other'],
      default: 'cash',
    },

    // Running total owed to this supplier (for credit purchases)
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplier: 1, purchasedAt: -1 });
purchaseOrderSchema.index({ purchasedAt: -1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ recordedBy: 1 });

// Virtual: amount still owed
purchaseOrderSchema.virtual('amountOwed').get(function () {
  return Math.max(0, this.totalCost - this.amountPaid);
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
