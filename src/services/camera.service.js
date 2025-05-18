/* eslint-disable radix */
/* eslint-disable no-plusplus */
/* eslint-disable prettier/prettier */
/* eslint-disable no-useless-catch */
const { Camera } = require('../models');
const farmService = require('./farm.service');

const createCamera = async (req) => {
  const { body } = req;
  body.createdByUser = req.user._id;
  try {
    await new Camera({ ...body }).save();
  } catch (error) {
    throw error;
  }
};
const queryCameraAggregated = async (filter, options, aggregateQuery) => {
  const farms = await Camera.aggregatedPaginate(filter, options, aggregateQuery);
  return farms;
};

const getUniqueCameraId = async () => {
  const highestCamera = await Camera.findOne().sort({ cameraId: -1 });

  let suffix = 1;
  if (highestCamera) {
    const highestSuffix = parseInt(highestCamera.cameraId.replace('CAM', ''));
    suffix = highestSuffix + 1;
  }

  const formattedSuffix = suffix.toString().padStart(3, '0');
  const nextCameraId = `CAM${formattedSuffix}`;

  return nextCameraId;
};

const deleteCamera = async (id) => {
  try {
    const deletedCamera = await Camera.findByIdAndDelete(id);
    if (!deletedCamera) {
      throw new Error('Camera not found');
    }
    return deletedCamera;
  } catch (error) {
    throw error;
  }
};

const updateCamera = async (id, updates) => {
  try {
    let updateObject = { ...updates };

    if (updates.status === 'available' || updates.status === 'decommissioned') {
      const farmName = await farmService.getFarmById(updates.assignedToFarm);
      const sNo = Object.keys(updates.lendingHistory).length + 1;
      const newHistoryItem = {
        sNo,
        businessAccountRef: farmName.businessAccountRef.businessAccountName,
        assignedToFarm: `${farmName.farmId} - ${farmName.title}`,
        returnDate: updates.returnDate,
        lendDate: updates.lendDate,
      };

      updateObject = {
        ...updateObject,
        assignedToFarm: null,
        businessAccountRef: null,
        assignmentTerm: null,
        returnDate: null,
        lendDate: null,
        lendingHistory: [...(updates.lendingHistory || []), newHistoryItem],
      };
    }

    const updatedCamera = await Camera.findByIdAndUpdate(id, updateObject, { new: true });
    if (!updatedCamera) {
      throw new Error(`Camera with ID: ${id} not found`);
    }

    return updatedCamera;
  } catch (error) {
    throw error;
  }
};

const getCameraById = async (id) => {
  try {
    const camera = await Camera.findById(id);
    if (!camera) {
      throw new Error('Camera not found');
    }
    return camera;
  } catch (error) {
    throw error;
  }
};

module.exports = { createCamera, queryCameraAggregated, getCameraById, deleteCamera, updateCamera, getUniqueCameraId };
