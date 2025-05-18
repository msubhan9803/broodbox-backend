/* eslint-disable no-useless-catch */
const { Training } = require('../models');

const createTraining = async (req) => {
  const { body } = req;
  body.createdByUser = req.user._id;
  try {
    await new Training({ ...body }).save();
  } catch (error) {
    throw error;
  }
};
const queryTrainingAggregated = async (filter, options, aggregateQuery) => {
  const farms = await Training.aggregatedPaginate(filter, options, aggregateQuery);
  return farms;
};

const deleteTraining = async (id) => {
  try {
    const deletedTraining = await Training.findByIdAndDelete(id);
    if (!deletedTraining) {
      throw new Error('Training not found');
    }
    return deletedTraining;
  } catch (error) {
    throw error;
  }
};

const updateTraining = async (id, updates) => {
  try {
    const updatedTraining = await Training.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedTraining) {
      throw new Error('Training not found');
    }
    return updatedTraining;
  } catch (error) {
    throw error;
  }
};
const getTrainingById = async (id) => {
  try {
    const training = await Training.findById(id);
    if (!training) {
      throw new Error('Training not found');
    }
    return training;
  } catch (error) {
    throw error;
  }
};

module.exports = { createTraining, queryTrainingAggregated, getTrainingById, deleteTraining, updateTraining };
