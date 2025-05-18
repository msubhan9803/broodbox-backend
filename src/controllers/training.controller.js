/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
// const axios = require('axios');
const httpStatus = require('http-status');
const { trainingService, activityLogService } = require('../services/index');
const catchAsync = require('../utils/catchAsync');
const { activityLogsActions } = require('../utils/constants');
const pick = require('../utils/pick');

const getAllTrainings = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, ['search']);
    const caseInsensitiveFilter = {};

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const aggregateQuery = [
      { $match: caseInsensitiveFilter },
      // {
      //   $lookup: {
      //     from: 'users',
      //     localField: 'createdByUser',
      //     foreignField: '_id',
      //     as: 'createdByUser',
      //   },
      // },
      // { $unwind: '$createdByUser' },
    ];

    if (filter.search) {
      aggregateQuery.push({
        $match: {
          $or: [{ action: { $regex: new RegExp(filter.search, 'i') } }],
        },
      });
    }

    const result = await trainingService.queryTrainingAggregated(caseInsensitiveFilter, options, aggregateQuery);

    res.send(result);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createTraining = catchAsync(async (req, res) => {
  const { body } = req;

  const results = await trainingService.createTraining(req);

  // await activityLogService.createActivityLog({
  //   createdByUser: req.user._id,
  //   action: activityLogsActions.trainingCreated,
  //   actionDetails: `Training Created`,
  //   actionObject: {
  //     details: { ...body },
  //   },
  // });

  res.status(200).json({ results });
});

const deleteTrainingHandler = catchAsync(async (req, res) => {
  const { id } = req.params;

  const deletedTraining = await trainingService.deleteTraining(id);

  res.status(200).json({ message: 'Training deleted successfully', deletedTraining });
});

const updateTrainingHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { body } = req;

  const updatedTraining = await trainingService.updateTraining(id, body);

  res.status(200).json({ message: 'Training updated successfully', updatedTraining });
});

const getTrainingByIdHandler = catchAsync(async (req, res) => {
  const { id } = req.params;

  const training = await trainingService.getTrainingById(id);

  res.status(200).json({ training });
});

module.exports = { getAllTrainings, createTraining, deleteTrainingHandler, updateTrainingHandler, getTrainingByIdHandler };
