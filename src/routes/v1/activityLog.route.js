/* eslint-disable prettier/prettier */
const express = require('express');
const auth = require('../../middlewares/auth');
const activityLogController = require('../../controllers/activityLog.controller');

const router = express.Router();

router.post('/createActivityLog', auth(), activityLogController.createActivityLog);
router.get('/getAllActivityLogs', auth(), activityLogController.getAllActivityLogs);

module.exports = router;
