/* eslint-disable prettier/prettier */
/* eslint-disable no-dupe-keys */
const httpStatus = require('http-status');
const { cameraService } = require('../services/index');
const catchAsync = require('../utils/catchAsync');
require('../utils/constants');
const pick = require('../utils/pick');

const getAllCameras = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, ['search']);
    const caseInsensitiveFilter = {};

    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    const aggregateQuery = [
      { $match: caseInsensitiveFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'businessAccountRef',
          foreignField: '_id',
          as: 'businessAccountRef',
        },
      },
      {
        $unwind: {
          path: '$businessAccountRef',
          preserveNullAndEmptyArrays: true, // Preserve documents that don't match the lookup
        },
      },

      {
        $lookup: {
          from: 'farms',
          localField: 'assignedToFarm',
          foreignField: '_id',
          as: 'assignedToFarm',
        },
      },
      {
        $unwind: {
          path: '$assignedToFarm',
          preserveNullAndEmptyArrays: true, // Preserve documents that don't match the lookup
        },
      },
    ];

    if (filter.search) {
      aggregateQuery.push({
        $match: {
          $or: [
            { title: { $regex: new RegExp(filter.search, 'i') } },
            { cameraId: { $regex: new RegExp(filter.search, 'i') } },
            { model: { $regex: new RegExp(filter.search, 'i') } },
          ],
        },
      });
    }

    const result = await cameraService.queryCameraAggregated(caseInsensitiveFilter, options, aggregateQuery);

    res.send(result);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const createCamera = catchAsync(async (req, res) => {
  const results = await cameraService.createCamera(req);

  // await activityLogService.createActivityLog({
  //   createdByUser: req.user._id,
  //   action: activityLogsActions.cameraAdded,
  //   actionDetails: `Camera Added`,
  //   actionObject: {
  //     details: { ...body },
  //   },
  // });

  res.status(200).json({ results });
});

const deleteCameraHandler = catchAsync(async (req, res) => {
  const { id } = req.params;

  const deletedCamera = await cameraService.deleteCamera(id);

  res.status(200).json({ message: 'Camera deleted successfully', deletedCamera });
});

const updateCameraHandler = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { body } = req;

  const updatedCamera = await cameraService.updateCamera(id, body);

  res.status(200).json({ message: 'Camera updated successfully', updatedCamera });
});

const getCameraByIdHandler = catchAsync(async (req, res) => {
  const { id } = req.params;

  const camera = await cameraService.getCameraById(id);

  res.status(200).json({ camera });
});

const getUniqueCameraId = catchAsync(async (req, res) => {
  try {
    const cameraId = await cameraService.getUniqueCameraId();

    res.status(httpStatus.OK).json({ cameraId });
  } catch (error) {
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Resource not found' });
  }
});

module.exports = {
  getAllCameras,
  createCamera,
  deleteCameraHandler,
  updateCameraHandler,
  getCameraByIdHandler,
  getUniqueCameraId,
};
