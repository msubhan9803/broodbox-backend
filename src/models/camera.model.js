const mongoose = require('mongoose');
const { aggregatedPaginate } = require('./plugins/index');

// const lendingHistorySchema = new mongoose.Schema({
//   sNo: Number,
//   businessAccountRef: String,
//   assignedToFarm: String,
//   returnDate: Date,
//   lendDate: Date,
// });

const cameraSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      default: null, // Set default as null if an empty string is provided
    },
    title: {
      type: String,
      required: [true, 'title is required'],
    },
    model: {
      type: String,
      required: [true, 'model is required'],
    },
    assignedToFarm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      default: null,
      set: (value) => (value === '' ? null : value),
    },
    businessAccountRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      set: (value) => (value === '' ? null : value),
    },
    assignmentTerm: {
      type: String,
      default: null,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: [true, 'status is required'],
    },
    lendDate: {
      type: Date,
      default: null,
    },
    lendingHistory: [],
  },
  {
    timestamps: true,
  }
);

cameraSchema.pre('save', function (next) {
  const camera = this;

  const fieldsToNullify = ['cameraId', 'businessAccountRef', 'assignedToFarm', 'assignmentTerm', 'returnDate', 'lendDate'];
  fieldsToNullify.forEach((field) => {
    if (camera[field] === '') {
      camera[field] = null;
    }
  });

  next();
});

cameraSchema.plugin(aggregatedPaginate);

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = Camera;
