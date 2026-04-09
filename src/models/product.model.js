const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },

    unit: { type: String, default: 'piece' }, // piece, pack, bottle, kilo, sachet…

    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },

    // Loose / tingi selling support
    hasLooseUnit: { type: Boolean, default: false },
    looseUnit: { type: String, default: '' }, // e.g. "stick", "cup"
    loosePrice: { type: Number, default: 0 },

    stockQty: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },

    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', sku: 'text' }); // full-text search
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ stockQty: 1 }); // low-stock queries

// Virtual: profit margin %
productSchema.virtual('marginPct').get(function () {
  if (!this.buyingPrice) return 0;
  return (((this.sellingPrice - this.buyingPrice) / this.sellingPrice) * 100).toFixed(1);
});

// Plugins
productSchema.plugin(toJSON);
productSchema.plugin(paginate);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
