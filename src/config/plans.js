// Fallback / seed data for the Plan collection. Source of truth once seeded is the DB,
// this file only matters for the initial seed script and as a typed reference.
// eslint-disable-next-line import/prefer-default-export
export const PLAN_SEED_DATA = [
  {
    key: 'free',
    displayName: 'Explore',
    price: 0,
    billingCycleDays: 30,
    photoLimit: 3,
    features: [
      'Create your first shoppable post',
      'Add your affiliate links',
      'Browse unlimited public inspirations',
      'Save your favorite posts',
    ],
    isActive: true,
  },
  {
    key: 'spark',
    displayName: 'Spark',
    price: 199,
    billingCycleDays: 30,
    photoLimit: 100,
    features: [
      'Upload up to 100 shoppable posts',
      'Post performance analytics',
      'Faster uploads',
      'Access to upcoming feature updates',
      'Viral Female Fashion Prompt Collection',
    ],
    isActive: true,
  },
  {
    key: 'infinity',
    displayName: 'Infinity',
    price: 350,
    billingCycleDays: 30,
    photoLimit: null,
    features: [
      'Unlimited photos & shoppable posts',
      'Unlimited collections',
      'Complete AI Prompt Library',
      'Step-by-step Tutorials',
      'Advanced Analytics Dashboard',
      'Premium Creator Resources',
      'Early Access to New Features',
      'Priority Support',
    ],
    isActive: true,
  },
];
