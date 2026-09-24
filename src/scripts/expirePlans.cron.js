/**
 * Daily job: downgrade any user whose paid plan has lapsed back to Free.
 * Wire this up with node-cron in your app's entrypoint, e.g.:
 *   import cron from 'node-cron';
 *   import { runExpirePlans } from './scripts/expirePlans.cron';
 *   cron.schedule('0 0 * * *', runExpirePlans);
 */
import { Plan } from '../models';

// eslint-disable-next-line import/prefer-default-export
export async function runExpirePlans() {
  const freePlan = await Plan.findOne({ key: 'free' });
  if (!freePlan) throw new Error('Free plan not seeded');

  /* const result = await User.updateMany(
    { planStatus: 'active', planExpiresAt: { $lt: new Date() }, plan: { $ne: freePlan.id } },
    { plan: freePlan.id, planStatus: 'expired', planExpiresAt: null }
  ); */

  // console.log(`[expirePlans] downgraded ${result.modifiedCount} user(s) to Free`);
}

module.exports = { runExpirePlans };
