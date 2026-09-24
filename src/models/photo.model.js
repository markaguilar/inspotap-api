import mongoose, { Schema } from 'mongoose';

const hotspotSchema = mongoose.Schema(
  {
    xPercent: { type: Number, min: 0, max: 100, required: true },
    yPercent: { type: Number, min: 0, max: 100, required: true },
    productName: { type: String, required: true, maxlength: 120, trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    price: { type: Number, min: 0, default: null },
  },
  { _id: true }
);

const photoSchema = mongoose.Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    caption: { type: String, maxlength: 500, default: '' },
    hotspots: { type: [hotspotSchema], default: [] },
    isPublic: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    viewCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

photoSchema.index({ user: 1, createdAt: -1 });
photoSchema.index({ isPublic: 1, status: 1, _id: -1 }); // feed pagination

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;
