const mongoose = require('mongoose');

const planUpgradeRequestSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    requestedPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: '' },
  },
  { timestamps: true }
);

const PlanUpgradeRequest = mongoose.model('PlanUpgradeRequest', planUpgradeRequestSchema);

module.exports = PlanUpgradeRequest;
