import mongoose, { Schema } from 'mongoose';

const planSchema = new Schema(
  {
    key: { type: String, enum: ['free', 'spark', 'infinity'], unique: true, required: true },
    displayName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    billingCycleDays: { type: Number, default: 30 },
    photoLimit: { type: Number, default: null }, // null = unlimited
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Plan = mongoose.model('Plan', planSchema);
module.exports = Plan;
