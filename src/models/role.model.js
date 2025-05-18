const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const roleSchema = mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.model('Role', roleSchema);

// add plugin that converts mongoose to json
roleSchema.plugin(toJSON);

module.exports = Role;
