const mongoose = require('mongoose');

const collectionSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, maxlength: 60, trim: true },
    isDefault: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// a user should only ever have one default "Saved" collection
collectionSchema.index({ user: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
