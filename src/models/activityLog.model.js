/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const { aggregatedPaginate } = require('./plugins');
const { activityLogsActions } = require('../utils/constants');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: Object.values(activityLogsActions),
      required: true,
    },
    actionDetails: {
      type: String,
      required: true,
    },
    actionObject: {
      type: Object,
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.plugin(aggregatedPaginate);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
