const { AuditLog } = require('../models');

/**
 * Write an audit log entry.
 *
 * This is fire-and-forget — it NEVER throws or blocks the calling service.
 * A logging failure should never fail a checkout or any other operation.
 *
 * Usage in any service:
 *   auditLogService.log({
 *     performedBy: req.user,
 *     action: 'CHECKOUT',
 *     targetModel: 'Transaction',
 *     targetId: txn._id,
 *     after: { totalAmount: txn.totalAmount, items: txn.items.length },
 *     req,
 *   });
 */
const log = ({
  performedBy, // full User object or { _id, name }
  action, // enum from AuditLog.model
  targetModel = null,
  targetId = null,
  before = null,
  after = null,
  metadata = null,
  req = null, // Express req — used for IP and User-Agent
}) => {
  // Extract request context safely
  const ip = req ? req.headers['x-forwarded-for'] || (req.socket ? req.socket.remoteAddress : null) || null : null;

  const userAgent = req ? req.headers['user-agent'] || null : null;

  // Fire and forget — intentionally not awaited
  AuditLog.create({
    performedBy: performedBy._id,
    performedByName: performedBy.name,
    action,
    targetModel,
    targetId,
    before,
    after,
    metadata,
    ip,
    userAgent,
  }).catch((err) => {
    // Log to console but never surface to user
    // eslint-disable-next-line no-console
    console.error('[AuditLog] Failed to write log:', err.message, { action, performedBy: performedBy._id });
  });
};

/**
 * Query audit logs with filters + pagination.
 * Used by the owner's audit log viewer page.
 */
const queryLogs = async (filter = {}, options = {}) => {
  const { page = 1, limit = 50, sortOrder = 'desc' } = options;

  const query = {};

  if (filter.performedBy) query.performedBy = filter.performedBy;
  if (filter.action) query.action = filter.action;
  if (filter.targetModel) query.targetModel = filter.targetModel;
  if (filter.targetId) query.targetId = filter.targetId;

  if (filter.from || filter.to) {
    query.createdAt = {};
    if (filter.from) query.createdAt.$gte = new Date(filter.from);
    if (filter.to) {
      const to = new Date(filter.to);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('performedBy', 'name email role'),
    AuditLog.countDocuments(query),
  ]);

  return {
    results,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
  };
};

module.exports = { log, queryLogs };
