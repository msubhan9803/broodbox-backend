const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const moduleSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    label: {
      type: String,
      required: true,
      unique: true,
    },
    defaultScreen: {
      type: mongoose.Types.ObjectId,
      ref: 'Screen',
    },
    icon: String,
    status: { type: Boolean, default: true },
    order: Number,
  },
  {
    timestamps: true,
  }
);

const Module = mongoose.model('Module', moduleSchema);

// add plugin that converts mongoose to json
moduleSchema.plugin(toJSON);

module.exports = Module;
