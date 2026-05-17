const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

// ── GET /reports/summary ──────────────────────────────────────────────────────
// No query params — always returns today's data

const getSummary = { query: Joi.object({}) };

// ── GET /reports/daily ────────────────────────────────────────────────────────

const getDaily = {
  query: Joi.object({
    date: Joi.date()
      .max('now')
      .default(() => new Date())
      .messages({ 'date.max': 'Date cannot be in the future.' }),

    includeManual: Joi.boolean().default(true),
  }),
};

// ── GET /reports/daily/compare ────────────────────────────────────────────────

const getDailyComparison = {
  query: Joi.object({
    date: Joi.date()
      .max('now')
      .default(() => new Date()),
  }),
};

// ── GET /reports/sellers ──────────────────────────────────────────────────────

const getSellers = {
  query: Joi.object({
    from: Joi.date()
      .default(() => new Date())
      .messages({ 'date.base': 'from must be a valid date.' }),
    to: Joi.date()
      .min(Joi.ref('from'))
      .default(() => new Date())
      .messages({
        'date.min': 'to must be the same as or after from.',
      }),
  }),
};

// ── GET /reports/utang ────────────────────────────────────────────────────────

const getUtangSummary = {
  query: Joi.object({
    date: Joi.date()
      .max('now')
      .default(() => new Date()),
  }),
};

// ── GET /reports/audit-logs ───────────────────────────────────────────────────

const getAuditLogs = {
  query: Joi.object({
    performedBy: Joi.string().custom(objectId).optional(),
    action: Joi.string()
      .valid(
        'USER_LOGIN',
        'USER_LOGIN_NEW_DEVICE',
        'USER_LOGOUT',
        'USER_PASSWORD_CHANGE',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DEACTIVATED',
        'USER_CHECKOUT_ENABLED',
        'USER_CHECKOUT_DISABLED',
        'CHECKOUT',
        'MANUAL_ENTRY',
        'TRANSACTION_VOIDED',
        'SHIFT_OPENED',
        'SHIFT_CLOSED',
        'PRODUCT_CREATED',
        'PRODUCT_UPDATED',
        'PRODUCT_DEACTIVATED',
        'STOCK_ADJUSTED',
        'VOID_RATE_ALERT',
        'DAILY_LIMIT_REACHED',
        'LOW_STOCK_ALERT'
      )
      .optional(),
    targetModel: Joi.string().valid('Transaction', 'Product', 'User', 'Shift', 'HeldTransaction').optional(),
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

module.exports = {
  getSummary,
  getDaily,
  getDailyComparison,
  getSellers,
  getUtangSummary,
  getAuditLogs,
};
