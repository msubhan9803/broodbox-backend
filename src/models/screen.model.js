const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const screenSchema = mongoose.Schema(
  {
    moduleRef: {
      type: mongoose.Types.ObjectId,
      ref: 'Module',
    },
    name: String,
    label: String,
    url: String,
    actionsList: [
      {
        actionRef: {
          type: mongoose.Types.ObjectId,
          ref: 'Action',
        },
      },
    ],
    status: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const Screen = mongoose.model('Screen', screenSchema);

// add plugin that converts mongoose to json
screenSchema.plugin(toJSON);

module.exports = Screen;
