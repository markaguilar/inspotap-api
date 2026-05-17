const express = require('express');

const router = express.Router();

const auth = require('../../middlewares/auth');

const validate = require('../../middlewares/validate');

const { reportsValidation } = require('../../validations');

const reportsController = require('../../controllers/report.controller');

// All report routes are owner-only
// auth('getReports') — only owner role has this right in roles.js

/**
 * GET /api/v1/reports/summary
 * Today's dashboard snapshot.
 */
router.get('/summary', auth('getReports'), validate(reportsValidation.getSummary), reportsController.getSummary);

/**
 * GET /api/v1/reports/daily?date=YYYY-MM-DD&includeManual=true
 */
router.get('/daily', auth('getReports'), validate(reportsValidation.getDaily), reportsController.getDaily);

/**
 * GET /api/v1/reports/daily/compare?date=YYYY-MM-DD
 * Must be before /daily/:anything to avoid route conflict.
 */
router.get(
  '/daily/compare',
  auth('getReports'),
  validate(reportsValidation.getDailyComparison),
  reportsController.getDailyComparison
);

/**
 * GET /api/v1/reports/sellers?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/sellers', auth('getReports'), validate(reportsValidation.getSellers), reportsController.getSellers);

/**
 * GET /api/v1/reports/utang?date=YYYY-MM-DD
 */
router.get('/utang', auth('getReports'), validate(reportsValidation.getUtangSummary), reportsController.getUtangSummary);

/**
 * GET /api/v1/reports/audit-logs
 */
router.get('/audit-logs', auth('getAuditLogs'), validate(reportsValidation.getAuditLogs), reportsController.getAuditLogs);

module.exports = router;
