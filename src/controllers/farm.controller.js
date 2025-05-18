/* eslint-disable radix */
/* eslint-disable prefer-const */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
const httpStatus = require('http-status');
const axios = require('axios');
const mongoose = require('mongoose');
const { farmService, activityLogService, fileService } = require('../services/index');
const s3Service = require('../services/s3.service');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const message = require('../utils/message');
const tupleHelper = require('../utils/tupleHelper');
const ApiError = require('../utils/ApiError');
const { roleKeyValue } = require('../config/roles');
const { isObjectEmpty, convertToObjectId } = require('../utils/helper');
const { activityLogsActions } = require('../utils/constants');

const getUniqueFarmId = catchAsync(async (req, res) => {
  const farmId = await farmService.getUniqueFarmId(req.user);

  res.status(httpStatus.OK).json({ farmId });
});

const getAllFarms = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['search']);
  let caseInsensitiveFilter = {};
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const currentUserId = req.user._id;
  const currentUserRole = req.user.role;

  let aggregateQuery = [];

  if (currentUserRole === roleKeyValue.businessAccount) {
    caseInsensitiveFilter = { $match: { 'businessAccountRef._id': mongoose.Types.ObjectId(currentUserId) } };
  } else if (currentUserRole === roleKeyValue.user || currentUserRole === roleKeyValue.farmManager) {
    caseInsensitiveFilter = {
      $match: {
        $or: [
          { farmManagerRef: mongoose.Types.ObjectId(currentUserId) },
          { usersRef: mongoose.Types.ObjectId(currentUserId) },
        ],
      },
    };
  }

  aggregateQuery = [
    {
      $lookup: {
        from: 'users',
        localField: 'businessAccountRef',
        foreignField: '_id',
        as: 'businessAccountRef',
      },
    },
    { $unwind: '$businessAccountRef' },
    {
      $match: {
        'businessAccountRef.isArchived': { $ne: true },
      },
    },
  ];

  if (!isObjectEmpty(caseInsensitiveFilter)) {
    aggregateQuery.push(caseInsensitiveFilter);
  }

  if (filter.search) {
    aggregateQuery.push({
      $match: {
        $or: [{ farmId: { $regex: new RegExp(filter.search, 'i') } }, { title: { $regex: new RegExp(filter.search, 'i') } }],
      },
    });
  }

  const result = await farmService.queryFarmsAggregated(caseInsensitiveFilter, options, aggregateQuery);

  res.send(result);
});

const getAllUsersByFarmId = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const filter = pick(req.query, ['search', 'role']);
  const caseInsensitiveFilter = {
    farmId: { $eq: farmId },
  };

  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const aggregateQuery = [
    { $match: caseInsensitiveFilter },
    {
      $addFields: {
        combinedUsersRef: { $setUnion: ['$usersRef', ['$farmManagerRef'], ['$contractorRef']] },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'combinedUsersRef',
        foreignField: '_id',
        as: 'combinedUsersList',
      },
    },
    { $unwind: '$combinedUsersList' },
    {
      $replaceRoot: { newRoot: '$combinedUsersList' },
    },
  ];

  if (filter.search) {
    aggregateQuery.push({
      $match: {
        $or: [
          { fullName: { $regex: new RegExp(filter.search, 'i') } },
          { email: { $regex: new RegExp(filter.search, 'i') } },
        ],
      },
    });
  }

  if (filter.role) {
    aggregateQuery.push({
      $match: { role: { $eq: filter.role } },
    });
  }

  const result = await farmService.queryFarmsAggregated(caseInsensitiveFilter, options, aggregateQuery);

  res.send(result);
});

const getAllBeeHiveLocations = catchAsync(async (req, res) => {
  const { farmId, businessAccRef } = req.params;
  const { page, limit, sortBy, search } = req.query;
  const response = await axios.get(
    `${process.env.EXTERNAL}/hive/${businessAccRef}/${farmId}?limit=${limit}&page=${page}&search=${
      search || ''
    }&sortBy=${sortBy}`
  );
  if (response.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }
  res.status(httpStatus.OK).send({
    ...response.data,
  });
});

const getBeeHiveLocation = catchAsync(async (req, res) => {
  const { farmId, businessAccRef, area_code, location_code } = req.query;

  const response = await axios.get(
    `${process.env.EXTERNAL}/hive/get/${businessAccRef}/${farmId}/${area_code}/${location_code}`
  );
  if (response.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }
  res.status(httpStatus.OK).send({
    ...response.data,
  });
});

const deleteBeeHiveLocation = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId, areaCode, locationCode } = req.params;
  const { page, limit, sortBy } = req.query;
  const timezone = req.user.timezone;
  const response = await axios.post(
    `${process.env.EXTERNAL}/hive/delete/${businessAccountRef}/${farmId}/${areaCode}/${locationCode}?limit=${limit}&page=${page}&sortBy=${sortBy}`
  );
  if (response.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  /**
   * Calling Spatial Probability Table Update and Prediction Apis asynchronously
   */
  // farmService.handleSpatialUpdatesAndPredictionsGeneration(farmId, timezone);

  res.status(httpStatus.OK).send({
    ...response.data,
  });
});

const getFarmByFarmId = catchAsync(async (req, res) => {
  const { farmId } = req.params;

  const result = await farmService.getFarmWithCompleteDetails(farmId);

  res.status(httpStatus.OK).send(result);
});

const getFarmsByBusinessAccountRef = catchAsync(async (req, res) => {
  const { businessAccRef } = req.params;
  const farm = await farmService.getFarmsByBusinessAccountRef(businessAccRef, req.user);

  res.status(httpStatus.OK).send(farm);
});

const getCurrentFarmRefOfUser = catchAsync(async (req, res) => {
  const { userRef, businessAccountRef } = req.query;
  const users = await farmService.getCurrentFarmRefOfUser(userRef, businessAccountRef);
  res.send(users);
});

const getCurrentFarmsOfContractor = catchAsync(async (req, res) => {
  const { userRef, businessAccountRef } = req.body;
  const users = await farmService.getCurrentFarmsOfContractor(userRef, businessAccountRef);
  res.send(users);
});

const createFarm = catchAsync(async (req, res) => {
  const { farmId, title, businessAccountRef } = req.body;

  await farmService.checkIfAlreadyExist(farmId, title);

  const body = {
    farm_id: req.body.farmId,
    business_id: req.body.businessAccountRef,
  };

  body.boundaries = await tupleHelper.convertToListOfTuples(req.body.boundaries);

  await axios.post(`${process.env.EXTERNAL}/farm/add`, body);

  const farm = await farmService.createFarm({
    ...req.body,
    createdBy: req.user._id,
  });

  // Create Activity Log
  await activityLogService.createActivityLog({
    createdByUser: req.user._id,
    action: activityLogsActions.farmCreated,
    actionDetails: `Farm ${farmId} has been created`,
    actionObject: {
      farmId,
      businessAccountRef: convertToObjectId(businessAccountRef),
    },
  });

  res.status(httpStatus.OK).send(farm);
});

const updateFarm = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const { title, businessAccountRef, boundaries } = req.body;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  if (boundaries.length > 0) {
    const tuple = tupleHelper.convertToListOfTuples(req.body.boundaries);
    const payload = { farm_id: farmId, boundaries: tuple };

    const response = await axios.post(`${process.env.EXTERNAL}/farm/edit/${farmId}`, payload);
    if (response.status !== 200) {
      throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
    }
  }

  await farmService.updateFarm(farmId, {
    title: title || existingFarm.title,
    businessAccountRef: businessAccountRef || existingFarm.businessAccountRef,
    // farmManagerRef: farmManagerRef || existingFarm.farmManagerRef,
    // userRef: userRef || existingFarm.userRef,
  });

  // Create ActivityLog of Update Farm
  await activityLogService.createActivityLog({
    createdByUser: req.user._id,
    action: activityLogsActions.farmUpdated,
    actionDetails: `Farm ${farmId} has been updated`,
    actionObject: {
      farmId,
      businessAccountRef: convertToObjectId(businessAccountRef || existingFarm.businessAccountRef),
    },
  });

  res.status(httpStatus.OK).send({ message: message.ResourceUpdatedSuccessfully });
});

const deleteFarm = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  await farmService.deleteFarm(farmId);

  await axios.post(`${process.env.EXTERNAL}/farm/delete/${farmId}`);

  res.status(httpStatus.OK).send({ message: message.ResourceDeletedSuccessfully });
});

const addBeeHive = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const timezone = req.user.timezone;
  const { location_code, area_code, longitude, latitude, total_beehives, boundaries, businessAccountRef } = req.body;

  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  if (boundaries.length > 0) {
    // const tuple = tupleHelper.convertToListOfTuples(req.body.boundaries);
    const payload = {
      data: [
        {
          area_code,
          location_code,
          longitude,
          latitude,
          total_beehives,
        },
      ],
    };
    const response = await axios.post(`${process.env.EXTERNAL}/hive/add/${businessAccountRef}/${farmId}`, payload);

    const beehives = await axios.get(`${process.env.EXTERNAL}/hive/${businessAccountRef}/${farmId}?limit=500&page=1`);

    // Create Activity Log
    await activityLogService.createActivityLog({
      createdByUser: req.user._id,
      action: activityLogsActions.beehiveCreated,
      actionDetails: `Beehive Created for Farm ${farmId}`,
      actionObject: {
        area_code,
        location_code,
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        total_beehives,
        businessAccountRef: convertToObjectId(businessAccountRef),
        beehives: beehives.data.hive_details,
        farmId,
      },
    });

    /**
     * Calling Spatial Probability Table Update and Prediction Apis asynchronously
     */
    // farmService.handleSpatialUpdatesAndPredictionsGeneration(farmId, timezone);

    if (response.status !== 200) {
      throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
    }
    if (response.status === 200) {
      res.status(httpStatus.OK).send({ message: message.AddBeeHivesSuccess });
    }
  }
});

const addMultipleBeeHive = catchAsync(async (req, res) => {
  const { farmId, businessAccountRef } = req.query;
  const { allHiveLocations, boundaries } = req.body;

  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  if (boundaries.length > 0) {
    for (let index = 0; index < allHiveLocations.length; index += 1) {
      const { location_code, area_code, longitude, latitude, total_beehives } = allHiveLocations[index];

      const payload = {
        data: [
          {
            area_code,
            location_code,
            longitude,
            latitude,
            total_beehives,
          },
        ],
      };

      await axios.post(`${process.env.EXTERNAL}/hive/add/${businessAccountRef}/${farmId}`, payload);

      console.log('Updated hive location: ', index);
    }

    res.status(httpStatus.OK).send({ message: message.ResourceDeletedSuccessfully });
  }
});

const updateHive = catchAsync(async (req, res) => {
  const timezone = req.user.timezone;
  const { businessAccountRef, farmId, area_code, location_code } = req.params;
  const { img_urls, ac, lc, isUpdatingHiveImages } = req.body;

  const { beehiveLocations } = await farmService.getFarmWithCompleteDetails(farmId);

  const existingImagesList = beehiveLocations.find((loc) => loc.area_code === ac && loc.location_code === lc).img_urls;
  const imageUrls = img_urls || existingImagesList || '[]';

  if (img_urls) {
    const parsedUpdatedImages = img_urls ? await tupleHelper.convertTupleToArray(img_urls) : [];
    const parsedExistingImagesList = existingImagesList ? await tupleHelper.convertTupleToArray(existingImagesList) : [];

    if (parsedExistingImagesList.length > parsedUpdatedImages.length) {
      const listOfNonExistingHiveImages = parsedExistingImagesList
        .filter((imageUrl) => !parsedUpdatedImages.find((url) => url === imageUrl))
        .map((url) => url.split('getChildMedia/')[1]);

      if (listOfNonExistingHiveImages.length > 0) {
        await Promise.all(listOfNonExistingHiveImages.map((url) => s3Service.deleteMedia(url)))
          .then((result) => {
            console.log(result);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    }
  }

  const requestBody = {
    area_code,
    location_code,
    longitude: req.body.longitude,
    latitude: req.body.latitude,
    total_beehives: req.body.total_beehives,
    img_urls: imageUrls,
  };

  const response = await axios.post(
    `${process.env.EXTERNAL}/hive/update/${businessAccountRef}/${farmId}/${ac}/${lc}`,
    requestBody
  );
  if (response.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Could not update');
  }
  const beehives = await axios.get(`${process.env.EXTERNAL}/hive/${businessAccountRef}/${farmId}?limit=500&page=1`);

  // Create Activity Log
  await activityLogService.createActivityLog({
    createdByUser: req.user._id,
    action: activityLogsActions.beeHiveUpdate,
    actionDetails: `Beehive Updated in Farm ${farmId}`,
    actionObject: {
      area_code,
      location_code,
      longitude: parseFloat(req.body.longitude),
      latitude: parseFloat(req.body.latitude),
      total_beehives: req.body.total_beehives,
      businessAccountRef: convertToObjectId(businessAccountRef),
      beehives: beehives.data.hive_details,
      farmId,
    },
  });

  /**
   * Calling Spatial Probability Table Update and Prediction Apis asynchronously
   */
  // if (!isUpdatingHiveImages) {
  //   farmService.handleSpatialUpdatesAndPredictionsGeneration(farmId, timezone);
  // }

  res.status(httpStatus.OK).send({ message: message.ResourceUpdatedSuccessfully });
});

const updateMultipleHive = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.query;
  const allHiveLocations = req.body;

  for (let index = 0; index < allHiveLocations.length; index += 1) {
    const { area_code, img_urls, latitude, location_code, longitude, total_beehives } = allHiveLocations[index];

    const requestBody = {
      area_code,
      location_code,
      longitude,
      latitude,
      total_beehives,
      img_urls: img_urls || '[]',
    };

    await axios.post(
      `${process.env.EXTERNAL}/hive/update/${businessAccountRef}/${farmId}/${area_code}/${location_code}`,
      requestBody
    );

    console.log('Updated hive location: ', index);
  }

  res.status(httpStatus.OK).send({ message: message.ResourceUpdatedSuccessfully });
});

const getAllAreaLocationCodes = catchAsync(async (req, res) => {
  const { farmId, businessAccRef } = req.params;
  const result = await axios.get(`${process.env.EXTERNAL}/hive/${businessAccRef}/${farmId}`);
  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }
  res.status(httpStatus.OK).send({
    ...result.data,
  });
});

const getTimeToGeneratePollinationMap = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const response = await axios.get(`${process.env.EXTERNAL}/farm/${farmId}`);
  const boundaries = tupleHelper.parseListOfTuples(response.data.boundaries);

  const latitudeList = boundaries.map((boundary) => boundary.lat).join(',');
  const longitudeList = boundaries.map((boundary) => boundary.lng).join(',');

  const url = `${process.env.POLLINATION_EXTERNAL}/timing/?business_id=${existingFarm.businessAccountRef._id}&farm_id=${farmId}&lat_boundaries=${latitudeList}&long_boundaries=${longitudeList}`;
  const result = await axios.get(url);

  res.status(httpStatus.OK).json(result.data);
});

const generatePollinationMap = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const timezone = req.user.timezone;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.generatePollinationMap(farmId, timezone, existingFarm);

  res.status(httpStatus.OK).json(result);
});

const canCreateMapCheck = catchAsync(async (req, res) => {
  const { latitudeList, longitudeList } = req.body;

  const url = `${process.env.POLLINATION_EXTERNAL}/can_create_farm/?lat_boundaries=${latitudeList}&long_boundaries=${longitudeList}`;
  const result = await axios.get(url);

  res.status(httpStatus.OK).json(result.data);
});

const generatePollinationMapWithDateTime = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const url = `${process.env.POLLINATION_EXTERNAL}/map/get_maps_by_date/${existingFarm.businessAccountRef._id}/${farmId}?datetime=1`;
  const result = await axios.get(url);

  res.status(httpStatus.OK).json(result.data);
});

const getLatestPollinationMapState = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.getLatestPollinationMapState(farmId, existingFarm);

  res.status(httpStatus.OK).json(result);
});

const updateSpatialProbability = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.updateSpatialProbability(farmId, existingFarm);

  res.status(httpStatus.OK).json(result);
});

const generateAllPredictionsAndUpdateSpatialData = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const timezone = req.user.timezone;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.handleSpatialUpdatesAndPredictionsGeneration(farmId, timezone);

  res.status(httpStatus.OK).json(result);
});

const generateSpecificSpatialUpdatesAndPredictionsGeneration = catchAsync(async (req, res) => {
  const { farmId, businessAccRef, areaCode, locationCode } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.handleSpecificSpatialUpdatesAndPredictionsGeneration(
    farmId,
    businessAccRef,
    areaCode,
    locationCode
  );

  res.status(httpStatus.OK).json(result);
});

const getPredictions = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.getPredictions(farmId, existingFarm);

  res.status(httpStatus.OK).json(result);
});

const generateFirstMap = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const timezone = req.user.timezone;

  const result = await farmService.generateFirstMap(farmId, timezone);

  res.status(httpStatus.OK).json(result);
});

const didPredictionsRunOnce = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const result = await farmService.didPredictionsRunOnce(farmId, existingFarm);

  res.status(httpStatus.OK).json({ result });
});

const getSpecificPollinationMapByDateTime = catchAsync(async (req, res) => {
  const { farmId } = req.params;
  const { date, time } = req.params;
  const existingFarm = await farmService.getFarmByFarmId(farmId);
  if (!existingFarm) {
    throw new ApiError(httpStatus.NOT_FOUND, message.FarmNotFound);
  }

  const url = `${process.env.POLLINATION_EXTERNAL}/map/get_maps_by_date/${existingFarm.businessAccountRef._id}/${farmId}?datetime=0&date=${date}&time=${time}`;
  const result = await axios.get(url);

  res.status(httpStatus.OK).json(result.data);
});
const getAllFramesByFarmId = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.params;
  const result = await axios.get(
    `${process.env.ANALYTICS_EXTERNAL}/analytics/total_active_frames_by_area/${businessAccountRef}/${farmId}`
  );
  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }
  res.status(httpStatus.OK).send({
    ...result.data,
  });
});

const getAllAreaLocationActiveFrams = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.params;
  const result = await axios.get(
    `${process.env.ANALYTICS_EXTERNAL}/analytics/all_area_location_activeframes/${businessAccountRef}/${farmId}`
  );
  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }
  res.status(httpStatus.OK).send({
    ...result.data,
  });
});

const getAllDataAsList = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.params;
  const result = await axios.get(
    `${process.env.ANALYTICS_EXTERNAL}/analytics/all_analytics_as_lists/${businessAccountRef}/${farmId}`
  );
  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }
  res.status(httpStatus.OK).send({
    ...result.data,
  });
});

const getAllData = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.query;
  let { page, limit, search, sortBy } = req.query;

  // Set default limit and page if not provided
  limit = parseInt(limit) || 10;
  page = parseInt(page) || 1;

  // Get data from external API
  const result = await axios.get(`${process.env.ANALYTICS_EXTERNAL}/analytics/get_all/${businessAccountRef}/${farmId}`);
  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }

  // Filter results based on search query if provided
  let filteredData = result.data;
  if (search) {
    filteredData = filteredData.filter((item) =>
      Object.values(item).some((value) => value.toString().toLowerCase().includes(search.toLowerCase()))
    );
  }

  // Sort data if sortBy parameter is provided
  if (sortBy) {
    const [sortField, sortDirection] = sortBy.split(':');
    filteredData.sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Calculate total number of pages
  const totalRecords = filteredData.length;
  const totalPages = Math.ceil(totalRecords / limit);

  // Implement pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Prepare response with pagination details
  res.status(httpStatus.OK).send({
    data: paginatedData,
    pagination: {
      limit,
      page,
      total_pages: totalPages,
      total_records: totalRecords,
    },
  });
});

const getAllClassCountingData = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId } = req.params;
  const result = await axios.get(`${process.env.ANALYTICS_EXTERNAL}/predictions/get_all/${businessAccountRef}/${farmId}`);

  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }
  res.status(httpStatus.OK).send(result.data);
});

const getSpecificClassCountingData = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId, areaCode, locationCode } = req.params;
  const result = await axios.get(
    `${process.env.ANALYTICS_EXTERNAL}/predictions/get_specific/${businessAccountRef}/${farmId}/${areaCode}/${locationCode}`
  );
  const result2 = await axios.get(
    `${process.env.ANALYTICS_EXTERNAL}/analytics/get_specific/${businessAccountRef}/${farmId}/${areaCode}/${locationCode}`
  );

  const { global_ranking, local_ranking, location_richness, total_beehives } = result2.data;

  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }

  const response = {
    ...result.data,
    global_ranking,
    local_ranking,
    location_richness,
    total_beehives,
  };

  res.status(httpStatus.OK).send(response);
});

const getSpecificPredictions = catchAsync(async (req, res) => {
  const { businessAccountRef, farmId, areaCode, locationCode } = req.query;
  const url = `${process.env.PREDICTION_EXTERNAL}/get_specific_predictions?business_id=${businessAccountRef}&farm_id=${farmId}&area_code=${areaCode}&location_code=${locationCode}`;

  const result = await axios.get(url);

  if (result.status !== 200) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Resource not Found');
  }

  res.status(httpStatus.OK).send({
    ...result.data,
  });
});

const getFarmsByBusinessAccounts = catchAsync(async (req, res) => {
  const { businessesAccounts } = req.body;

  const farmId = await farmService.getFarmsByBusinessAccounts(businessesAccounts);

  res.status(httpStatus.OK).json(farmId);
});

const downloadBeehiveImages = catchAsync(async (req, res) => {
  const { farmId, businessAccRef, areaCode, locationCode } = req.params;

  const hiveData = await axios.get(
    `${process.env.EXTERNAL}/hive/get/${businessAccRef}/${farmId}/${areaCode}/${locationCode}`
  );
  const imageUrls = tupleHelper.convertTupleToArray(hiveData.data.img_urls);

  const tempDir = fileService.createTempDirectory();

  const downloadPromises = imageUrls.map(async (url, index) =>
    s3Service.downloadMedia(url.split('getChildMedia/')[1], index, tempDir)
  );

  const filePaths = await Promise.all(downloadPromises);

  const zipFilePath = `${tempDir}/archive.zip`;
  await fileService.createZipArchive(filePaths, zipFilePath);

  res.download(zipFilePath, 'images.zip', (err) => {
    if (err) {
      console.error('Error downloading zip file:', err);
      res.status(500).send('Error downloading zip file');
    } else {
      fileService.deleteTempDir(tempDir);
    }
  });
});

module.exports = {
  getLatestPollinationMapState,
  updateSpatialProbability,
  generateAllPredictionsAndUpdateSpatialData,
  generateSpecificSpatialUpdatesAndPredictionsGeneration,
  getPredictions,
  getSpecificPollinationMapByDateTime,
  generatePollinationMapWithDateTime,
  getSpecificClassCountingData,
  getAllClassCountingData,
  getAllData,
  getAllDataAsList,
  getAllAreaLocationActiveFrams,
  getAllFramesByFarmId,
  getUniqueFarmId,
  getAllFarms,
  getAllUsersByFarmId,
  getFarmByFarmId,
  getFarmsByBusinessAccountRef,
  getCurrentFarmRefOfUser,
  getCurrentFarmsOfContractor,
  createFarm,
  updateFarm,
  updateHive,
  updateMultipleHive,
  deleteFarm,
  addBeeHive,
  addMultipleBeeHive,
  getAllBeeHiveLocations,
  getBeeHiveLocation,
  deleteBeeHiveLocation,
  getAllAreaLocationCodes,
  getTimeToGeneratePollinationMap,
  generatePollinationMap,
  canCreateMapCheck,
  getSpecificPredictions,
  getFarmsByBusinessAccounts,
  downloadBeehiveImages,
  generateFirstMap,
  didPredictionsRunOnce,
};
