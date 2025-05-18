const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const farmRoute = require('./farm.route');
const trainingRoute = require('./training.route');
const config = require('../../config/config');
const s3 = require('./s3.route');
const userManagementRoute = require('./userManagement.route');
const activityLogRoute = require('./activityLog.route');
const camera = require('./camera.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/farms',
    route: farmRoute,
  },
  {
    path: '/trainings',
    route: trainingRoute,
  },
  {
    path: '/Camera',
    route: camera,
  },
  {
    path: '/usersManagement',
    route: userManagementRoute,
  },
  {
    path: '/S3',
    route: s3,
  },
  {
    path: '/activityLogs',
    route: activityLogRoute,
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
