const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const meRoute = require('./me.route');
const docsRoute = require('./docs.route');
const projectRoute = require('./project.route');
const proposalRoute = require('./proposal.route');

// store inventory and sales management
const productRoute = require('./product.route');
const categoryRoute = require('./category.route');
const unitRoute = require('./unit.route');
const transactionRoute = require('./transaction.route');

const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/me',
    route: meRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/projects',
    route: projectRoute,
  },
  {
    path: '/proposals',
    route: proposalRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/categories',
    route: categoryRoute,
  },
  {
    path: '/units',
    route: unitRoute,
  },
  {
    path: '/transactions',
    route: transactionRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
