/**
 * Run once (and any time PLAN_SEED_DATA changes) to sync the Plan collection.
 * Usage: node src/scripts/seedPlans.js
 */
const mongoose = require('mongoose');
const { Plan } = require('../models');
const { PLAN_SEED_DATA } = require('../config/plans');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/inspotap';

async function seed() {
  await mongoose.connect(MONGODB_URL);

  // eslint-disable-next-line no-restricted-syntax
  for (const planData of PLAN_SEED_DATA) {
    // eslint-disable-next-line no-await-in-loop
    await Plan.findOneAndUpdate({ key: planData.key }, planData, { upsert: true, new: true });
  }

  await mongoose.disconnect();
}

seed().catch(() => {
  process.exit(1);
});
