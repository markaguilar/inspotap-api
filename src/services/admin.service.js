// Thin re-export layer: admin-facing operations for plan upgrades live in
// planUpgrade.service.ts since the business logic is identical; this file is
// where you'd add other admin-only aggregate operations later
// (e.g. platform-wide stats, user bans, content moderation).
export {
  listUpgradeRequests,
  getUpgradeRequestById,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} from './planUpgrade.service';
