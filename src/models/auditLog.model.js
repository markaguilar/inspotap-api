const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema(
  {
    // Who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: { type: String, required: true }, // snapshot

    // What they did
    action: {
      type: String,
      required: true,
      enum: [
        // Auth
        'USER_LOGIN',
        'USER_LOGIN_NEW_DEVICE',
        'USER_LOGOUT',
        'USER_PASSWORD_CHANGE',

        // User management
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DEACTIVATED',
        'USER_CHECKOUT_ENABLED',
        'USER_CHECKOUT_DISABLED',

        // Transactions
        'CHECKOUT',
        'MANUAL_ENTRY',
        'TRANSACTION_VOIDED',

        // Shift
        'SHIFT_OPENED',
        'SHIFT_CLOSED',

        // Products
        'PRODUCT_CREATED',
        'PRODUCT_UPDATED',
        'PRODUCT_DEACTIVATED',
        'STOCK_ADJUSTED',

        // Alerts
        'VOID_RATE_ALERT',
        'DAILY_LIMIT_REACHED',
        'LOW_STOCK_ALERT',
      ],
    },

    // Reference to the affected document (optional)
    targetModel: {
      type: String,
      enum: ['Transaction', 'Product', 'User', 'Shift', 'HeldTransaction', null],
      default: null,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Snapshot of state before and after the action
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },

    // Extra context
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },

    // Request context
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: true,
    // Never update audit logs — they are append-only
  }
);

// Indexes for fast querying in audit log viewer
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
