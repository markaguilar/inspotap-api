const mongoose = require('mongoose');

const supplierSchema = mongoose.Schema(
  {
    // ── Core identity ─────────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: '',
      // Name of the person you call/deal with at the supplier
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // ── Address ───────────────────────────────────────────────────────────
    address: {
      street: { type: String, trim: true, default: '' },
      barangay: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      province: { type: String, trim: true, default: '' },
    },

    // ── Business terms ────────────────────────────────────────────────────
    paymentTerms: {
      type: String,
      enum: ['cash', 'cod', 'net7', 'net15', 'net30', 'consignment', 'other'],
      default: 'cash',
      // cash         — pay on delivery
      // cod          — cash on delivery (same day)
      // net7/15/30   — pay within N days after delivery
      // consignment  — pay after items are sold
    },

    deliveryDays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: [],
      // Which days of the week they deliver to your store
    },

    leadTimeDays: {
      type: Number,
      min: 0,
      default: 1,
      // How many days from placing order to receiving delivery
    },

    minimumOrder: {
      type: Number,
      min: 0,
      default: 0,
      // Minimum order amount in ₱ (0 = no minimum)
    },

    // ── Credit / utang tracking with supplier ─────────────────────────────
    // How much you currently owe this supplier
    // Updated when a purchase order is created (increases) or paid (decreases)
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      // Max credit this supplier extends to you — 0 means no credit
    },

    // ── Classification ────────────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
      // e.g. ['grocery', 'beverages', 'daily', 'weekly']
      // Used for filtering in the supplier list
    },

    // Internal reliability / quality rating: 1–5 stars
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // ── Metadata ──────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      default: '',
      // e.g. "Delivers Monday and Thursday. Call Mang Jose 09xx."
    },

    // Who added this supplier
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

supplierSchema.index({ name: 1 }, { unique: true });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ tags: 1 });
supplierSchema.index({ paymentTerms: 1 });
// Text search across name, contactPerson, notes
supplierSchema.index(
  { name: 'text', contactPerson: 'text', notes: 'text' },
  { weights: { name: 3, contactPerson: 2, notes: 1 } }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

// Full address string for display
supplierSchema.virtual('fullAddress').get(function () {
  const { street, barangay, city, province } = this.address;
  return [street, barangay, city, province].filter(Boolean).join(', ');
});

// Whether this supplier is on credit terms
supplierSchema.virtual('isOnCredit').get(function () {
  return ['net7', 'net15', 'net30', 'consignment'].includes(this.paymentTerms);
});

// ── Model ─────────────────────────────────────────────────────────────────────

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
