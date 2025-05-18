const mongoose = require('mongoose');
const { toJSON, aggregatedPaginate } = require('./plugins/index');

const trainingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required'],
    },
    description: {
      type: String,
      required: [true, 'description is required'],
    },
    video_url: {
      type: String,
      required: [true, 'video_url is required'],
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

trainingSchema.plugin(toJSON);
trainingSchema.plugin(aggregatedPaginate);

const Training = mongoose.model('Training', trainingSchema);

module.exports = Training;
