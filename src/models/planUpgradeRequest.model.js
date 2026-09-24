import mongoose, { Schema } from 'mongoose';

const planUpgradeRequestSchema = mongoose.Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentPlan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    requestedPlan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

const PlanUpgradeRequest = mongoose.model('PlanUpgradeRequest', planUpgradeRequestSchema);

module.exports = PlanUpgradeRequest;
