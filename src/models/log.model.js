const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const logSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    log: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Log = mongoose.model('Log', logSchema);

// add plugin that converts mongoose to json
logSchema.plugin(toJSON);

module.exports = Log;
