const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const meRoute = require('./me.route');
const docsRoute = require('./docs.route');

const collectionRoute = require('./collection.route');
const photosRoute = require('./photo.route');
const feedRoute = require('./feed.route');
const planRoute = require('./plan.route');
// const savedRoute = require('./saved.route');

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
    path: '/collections',
    route: collectionRoute,
  },
  {
    path: '/photos',
    route: photosRoute,
  },
  {
    path: '/feed',
    route: feedRoute,
  },
  {
    path: '/plans',
    route: planRoute,
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
