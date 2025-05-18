/* eslint-disable prettier/prettier */
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { roleKeyValue } = require('../config/roles');
const pick = require('../utils/pick');
const { activityLogService } = require('../services');

const getAllActivityLogs = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, ['search', 'role']);
    let caseInsensitiveFilter = {};
    const currentUserId = req.user._id;
    const currentUserRole = req.user.role;

    if (currentUserRole === roleKeyValue.businessAccount) {
      caseInsensitiveFilter = { 'actionObject.businessAccountRef': mongoose.Types.ObjectId(currentUserId) };
    }

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const aggregateQuery = [
      { $match: caseInsensitiveFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'createdByUser',
          foreignField: '_id',
          as: 'createdByUser',
        },
      },
      { $unwind: '$createdByUser' },
    ];

    if (filter.search) {
      aggregateQuery.push({
        $match: {
          $or: [{ action: { $regex: new RegExp(filter.search, 'i') } }],
        },
      });
    }

    if (filter.role) {
      aggregateQuery.push({
        $match: { role: { $eq: filter.role } },
      });
    }

    const result = await activityLogService.queryActivityLogAggregated(caseInsensitiveFilter, options, aggregateQuery);

    res.send(result);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createActivityLog = catchAsync(async (req, res) => {
  try {
    const activityLog = await activityLogService.createActivityLog(req);
    res.status(200).json({ message: 'Success', details: activityLog });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

module.exports = { createActivityLog, getAllActivityLogs };
