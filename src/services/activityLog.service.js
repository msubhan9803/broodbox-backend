/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
const ActivityLog = require('../models/activityLog.model');

const createActivityLog = async (body) => {
  try {
    const newActivityLog = new ActivityLog({ ...body });
    await newActivityLog.save();

    return newActivityLog;
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};

const queryActivityLogAggregated = async (filter, options, aggregateQuery) => {
  const farms = await ActivityLog.aggregatedPaginate(filter, options, aggregateQuery);
  return farms;
};

module.exports = { createActivityLog, queryActivityLogAggregated };
