const mongoose = require('mongoose');
const { toJSON, aggregatedPaginate } = require('./plugins/index');

const farmSchema = new mongoose.Schema(
  {
    businessAccountRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    farmId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
    farmManagerRef: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    contractorRef: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    usersRef: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isPollinationMapViewable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
farmSchema.plugin(toJSON);
farmSchema.plugin(aggregatedPaginate);

const Farm = mongoose.model('Farm', farmSchema);

module.exports = Farm;
