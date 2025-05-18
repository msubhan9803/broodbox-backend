const httpStatus = require('http-status');
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const { Farm } = require('../models/index');
const ApiError = require('../utils/ApiError');
const messages = require('../utils/message');
const { roleKeyValue } = require('../config/roles');
const { parseListOfTuples } = require('../utils/tupleHelper');
const { convertStringToArray } = require('../utils/helper');

/*
 * Generate unique farmId
 */
const getUniqueFarmId = async () => {
  let tempFarmId;
  do {
    tempFarmId = crypto.randomBytes(4).toString('hex');
  } while (await Farm.findOne({ farmId: tempFarmId }));

  return tempFarmId.toUpperCase();
};

/**
 * Check If Already Exist
 * @returns {Promise<farm>}
 */
const checkIfAlreadyExist = async (farmId, title) => {
  const existingFarm = await Farm.findOne({
    $or: [{ farmId }, { title }],
  });

  if (existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmAlreadyExists);
  }

  return existingFarm;
};

/**
 * Query for users aggregated
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryFarmsAggregated = async (filter, options, aggregateQuery) => {
  const farms = await Farm.aggregatedPaginate(filter, options, aggregateQuery);
  return farms;
};

/*
 * Get all Farms
 * @returns {Promise<farms>}
 */
const getAllFarm = async (user) => {
  const pipeline = [];

  if (user.role === 'superAdmin') {
    pipeline.push({ $match: {} });
  } else if (user.role === 'farmManager') {
    pipeline.push({ $match: { farmManagerRef: mongoose.Types.ObjectId(user._id) } });
  } else if (user.role === 'businessAccount') {
    pipeline.push({ $match: { createdBy: mongoose.Types.ObjectId(user._id) } });
  } else {
    // Assuming regular user
    pipeline.push({ $match: { usesRef: mongoose.Types.ObjectId(user._id) } });
  }

  const farms = await Farm.aggregate(pipeline);
  if (!farms) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }
  return farms;
};

/**
 * Get Single Farms
 * @returns {Promise<farm>}
 */
const getFarmByFarmId = async (farmId) => {
  const existingFarm = await Farm.findOne({ farmId }).populate('businessAccountRef farmManagerRef');
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  return existingFarm;
};

/**
 * Get Farm with complete details
 * @returns {Promise<farm>}
 */
const getFarmWithCompleteDetails = async (farmId) => {
  const farm = await Farm.findOne({ farmId }).populate('businessAccountRef farmManagerRef');
  if (!farm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  const response = await axios.get(`${process.env.EXTERNAL}/farm/${farmId}?`);
  if (!response.data.farm_id) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  const parsedBoundaries = parseListOfTuples(response.data.boundaries);

  const hiveData = await axios.get(`${process.env.EXTERNAL}/hive/${farm.businessAccountRef._id}/${farmId}`);

  return {
    farmId,
    farm,
    boundaries: parsedBoundaries,
    beehiveLocations: hiveData.data.hive_details,
  };
};

const getFarmById = async (id) => {
  const existingFarm = await Farm.findOne({ _id: id }).populate('businessAccountRef farmManagerRef');
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  return existingFarm;
};
/**
 * Get Farms by Business Account Reference
 * @returns {Promise<farm>}
 */
const getFarmsByBusinessAccountRef = async (businessAccountRef, user) => {
  let query;

  switch (user.role) {
    case roleKeyValue.superAdmin:
      query = { businessAccountRef };
      break;

    case roleKeyValue.businessAccount:
      query = { businessAccountRef };
      break;

    case roleKeyValue.farmManager:
      query = { businessAccountRef, farmManagerRef: user._id };
      break;

    case roleKeyValue.user:
      query = { businessAccountRef, usersRef: user._id };
      break;

    case roleKeyValue.contractor:
      query = { businessAccountRef, contractorRef: user._id };
      break;

    default:
      break;
  }

  return Farm.find(query);
};

/**
 * Get Current Farm Ref of User
 * @returns {Promise<User>}
 */
const getCurrentFarmRefOfUser = async (userRef, businessAccountRef) => {
  const farm = await Farm.findOne({
    $and: [
      { businessAccountRef: mongoose.Types.ObjectId(businessAccountRef) },
      {
        $or: [
          { businessAccountRef: mongoose.Types.ObjectId(userRef) },
          { farmManagerRef: mongoose.Types.ObjectId(userRef) },
          { usersRef: mongoose.Types.ObjectId(userRef) },
          { contractorRef: mongoose.Types.ObjectId(userRef) },
        ],
      },
    ],
  });

  return farm;
};

/**
 * Get Current Farms of Contractor
 * @returns {Promise<User>}
 */
const getCurrentFarmsOfContractor = async (userRef, businessAccountRef) => {
  const farms = await Farm.find({
    businessAccountRef: { $in: businessAccountRef },
    contractorRef: mongoose.Types.ObjectId(userRef),
  }).populate('businessAccountRef');

  return farms.map((farm) => ({
    value: farm.farmId,
    label: `${farm.farmId} - ${farm.title} (${farm.businessAccountRef.businessAccountName})`,
  }));
};

/**
 * Create Farm
 * @returns {Promise<farms>}
 */
const createFarm = async (body) => {
  const exisitngFarm = await Farm.findOne({ farmId: body.farmId });
  if (exisitngFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmAlreadyExists);
  }

  const farm = await Farm.create(body);
  if (!farm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  return farm;
};

/**
 * Get all Farms
 * @returns {Promise<farms>}
 */
const updateFarm = async (farmId, farmObj) => {
  const existingFarm = await Farm.findOne({ farmId });
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }

  const updateOperation = {};
  if (farmObj.userRef) {
    updateOperation.$push = { usersRef: farmObj.userRef };
    delete farmObj.userRef;
  }

  if (Object.keys(farmObj).length > 0) {
    updateOperation.$set = farmObj;
  }

  const updatedFarm = await Farm.updateOne({ farmId }, updateOperation, { new: true });

  return updatedFarm;
};

/**
 * Get all Farms
 * @returns {Promise<farms>}
 */
const deleteFarm = async (farmId) => {
  const farm = await Farm.deleteOne({ farmId });
  if (!farm) {
    throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  }
  return farm;
};

/**
 * Delete Farms by Business Account ref
 * @returns {Promise<farms>}
 */
const deleteFarmsByBusinessAccRef = async (businessAccountRef) => {
  await Farm.deleteMany({ businessAccountRef });
};

/**
 * Generate Pollination Map
 * @returns {Promise<farms>}
 */
const generatePollinationMap = async (farmId, timezone, farmData) => {
  const response = await axios.get(`${process.env.EXTERNAL}/farm/${farmId}`);
  const boundaries = parseListOfTuples(response.data.boundaries);

  const latitudeList = boundaries.map((boundary) => boundary.lat).join(',');
  const longitudeList = boundaries.map((boundary) => boundary.lng).join(',');

  try {
    const url = `${process.env.POLLINATION_EXTERNAL}/pollination/?time_zone=${timezone}&business_id=${farmData.businessAccountRef._id}&farm_id=${farmId}&lat_boundaries=${latitudeList}&long_boundaries=${longitudeList}`;
    const result = await axios.get(url);

    return result.data;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Generate Pollination Map
 * @returns {Promise<farms>}
 */
const getLatestPollinationMapState = async (farmId, farmData) => {
  try {
    const url = `${process.env.POLLINATION_EXTERNAL}/map/get_maps_by_date/${farmData.businessAccountRef._id}/${farmId}`;
    const result = await axios.get(url);

    return result.data;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Did Predictions Run Once
 * @returns {Promise<farms>}
 */
const didPredictionsRunOnce = async (farmId, farmData) => {
  try {
    const url = `${process.env.PREDICTION_EXTERNAL}/did_predictions_run?business_id=${farmData.businessAccountRef._id}&farm_id=${farmId}`;
    const { data } = await axios.get(url);

    return data.results === 1;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Update Spatial Probability
 * @returns {Promise<farms>}
 */
const updateSpatialProbability = async (farmId, farmData) => {
  try {
    const url = `${process.env.POLLINATION_EXTERNAL}/update_spatial_probability?business_id=${farmData.businessAccountRef._id}&farm_id=${farmId}`;
    const result = await axios.get(url);

    return result.data;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Get Predictions
 * @returns {Promise<farms>}
 */
const getPredictions = async (farmId, farmData) => {
  try {
    const url = `${process.env.PREDICTION_EXTERNAL}/get_predictions?business_id=${farmData.businessAccountRef._id}&farm_id=${farmId}`;
    const result = await axios.get(url);

    return result.data;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Get Specific Predictions
 * @returns {Promise<farms>}
 */
const getSpecificPredictions = async (businessAccRef, farmId, areaCode, locationCode) => {
  try {
    const url = `${process.env.PREDICTION_EXTERNAL}/get_specific_predictions?business_id=${businessAccRef}&farm_id=${farmId}&area_code=${areaCode}&location_code=${locationCode}`;
    const result = await axios.get(url);

    return result.data;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

/**
 * Handle Spatial Updates and Predictions Generation
 */
const handleSpatialUpdatesAndPredictionsGeneration = async (farmId, timezone) => {
  await Farm.updateOne({ farmId }, { isPollinationMapViewable: false });

  const { farm } = await getFarmWithCompleteDetails(farmId);

  await getPredictions(farmId, farm);
  // await updateSpatialProbability(farmId, farm);
  // await generatePollinationMap(farmId, timezone, farm);

  await Farm.updateOne({ farmId }, { isPollinationMapViewable: true });
};

/**
 * Handle Specific Spatial Updates and Predictions Generation
 */
const handleSpecificSpatialUpdatesAndPredictionsGeneration = async (farmId, businessAccRef, areaCode, locationCode) => {
  await Farm.updateOne({ farmId }, { isPollinationMapViewable: false });
  // const { farm } = await getFarmWithCompleteDetails(farmId);

  await getSpecificPredictions(businessAccRef, farmId, areaCode, locationCode);
  // await updateSpatialProbability(farmId, farm);

  await Farm.updateOne({ farmId }, { isPollinationMapViewable: true });
};

/**
 * Generate First Map
 */
const generateFirstMap = async (farmId, timezone) => {
  await Farm.updateOne({ farmId }, { isPollinationMapViewable: false });

  const { farm } = await getFarmWithCompleteDetails(farmId);

  await updateSpatialProbability(farmId, farm);
  await generatePollinationMap(farmId, timezone, farm);

  await Farm.updateOne({ farmId }, { isPollinationMapViewable: true });
};

/**
 * Get Farms By Business Accounts
 * @param {Array<ObjectId>} businessesAccounts - Array of business account ObjectIds
 * @returns {Promise<Array<farm>>}
 */
const getFarmsByBusinessAccounts = async (businessesAccounts) => {
  const existingFarms = await Farm.find({ businessAccountRef: { $in: businessesAccounts } }).populate('businessAccountRef');

  // if (existingFarms.length === 0) {
  //   throw new ApiError(httpStatus.NOT_FOUND, messages.FarmNotFound);
  // }

  return existingFarms;
};

/**
 * Remove a user from the usersRef array of a Farm document
 * @param {mongoose.Types.ObjectId} userRef - The user reference to remove
 * @returns {Promise<Farm>} The updated farm document
 */
const removeUserFromFarm = async (userRef) => {
  try {
    const updatedFarms = await Farm.updateMany(
      { usersRef: userRef },
      { $pull: { usersRef: userRef } },
      { new: true, multi: true }
    );
    return updatedFarms;
  } catch (error) {
    console.error('Error removing user from farms:', error);
    throw error;
  }
};

/**
 * Remove farm manager from farm
 * @param {mongoose.Types.ObjectId} farmManagerRef - The user reference to remove
 * @returns {Promise<Farm>} The updated farm document
 */
const removeFarmManagerFromFarm = async (farmManagerRef) => {
  try {
    const updatedFarms = await Farm.updateMany({ farmManagerRef }, { farmManagerRef: null }, { new: true, multi: true });
    return updatedFarms;
  } catch (error) {
    console.error('Error removing user from farms:', error);
    throw error;
  }
};

/**
 * Remove contractor from farm
 * @param {mongoose.Types.ObjectId} contractorRef - The user reference to remove
 * @returns {Promise<Farm>} The updated farm document
 */
const removeContractorFromFarm = async (contractorRef) => {
  try {
    const updatedFarms = await Farm.updateMany({ contractorRef }, { contractorRef: null }, { new: true, multi: true });
    return updatedFarms;
  } catch (error) {
    console.error('Error removing user from farms:', error);
    throw error;
  }
};

module.exports = {
  getFarmById,
  getFarmWithCompleteDetails,
  getUniqueFarmId,
  checkIfAlreadyExist,
  getAllFarm,
  getFarmByFarmId,
  getFarmsByBusinessAccountRef,
  getCurrentFarmRefOfUser,
  getCurrentFarmsOfContractor,
  createFarm,
  queryFarmsAggregated,
  updateFarm,
  deleteFarm,
  deleteFarmsByBusinessAccRef,
  generatePollinationMap,
  getLatestPollinationMapState,
  updateSpatialProbability,
  getPredictions,
  handleSpatialUpdatesAndPredictionsGeneration,
  handleSpecificSpatialUpdatesAndPredictionsGeneration,
  getFarmsByBusinessAccounts,
  removeUserFromFarm,
  removeFarmManagerFromFarm,
  removeContractorFromFarm,
  generateFirstMap,
  didPredictionsRunOnce,
};
