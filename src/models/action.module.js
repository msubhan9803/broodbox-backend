const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const actionSchema = mongoose.Schema(
  {
    actionId: String,
    actionName: String,
  },
  {
    timestamps: true,
  }
);

const Action = mongoose.model('Action', actionSchema);

// add plugin that converts mongoose to json
actionSchema.plugin(toJSON);

module.exports = Action;
