import mongoose, { Schema } from 'mongoose';

const paymentSchema = mongoose.Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'PHP' },
    method: { type: String, enum: ['gcash', 'bank_transfer', 'paymongo_card', 'paymongo_gcash'], required: true },
    referenceNumber: { type: String, required: true, trim: true },
    proofImageUrl: { type: String, required: true },
    proofImagePublicId: { type: String },
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'refunded'], default: 'pending', index: true },
    gatewayPaymentIntentId: { type: String, default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
