const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const privilegeSchema = mongoose.Schema(
  {
    role: String,
    moduleList: [
      {
        moduleRef: {
          type: mongoose.Types.ObjectId,
          ref: 'Module',
        },
        screenList: [
          {
            screenRef: {
              type: mongoose.Types.ObjectId,
              ref: 'Screen',
            },
            actionList: [
              {
                actionRef: {
                  type: mongoose.Types.ObjectId,
                  ref: 'Action',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Privilege = mongoose.model('Privilege', privilegeSchema);

// add plugin that converts mongoose to json
privilegeSchema.plugin(toJSON);

module.exports = Privilege;
