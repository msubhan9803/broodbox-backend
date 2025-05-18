const express = require('express');
const auth = require('../../middlewares/auth');
const { farmController } = require('../../controllers/index');

const router = express.Router();

router.get('/getUniqueFarmId', auth(), farmController.getUniqueFarmId);
router.get('/getAllFarms', auth(), farmController.getAllFarms);
router.get('/getAllUsersByFarmId/:farmId', auth(), farmController.getAllUsersByFarmId);
router.get('/getFarmsByBusinessAccountRef/:businessAccRef', auth(), farmController.getFarmsByBusinessAccountRef);
router.get('/getAllBeeHiveLocations/:businessAccRef/:farmId', auth(), farmController.getAllBeeHiveLocations);
router.get('/getBeeHiveLocation', auth(), farmController.getBeeHiveLocation);
router.get('/getCurrentFarmRefOfUser', farmController.getCurrentFarmRefOfUser);
router.get(
  '/deleteBeeHiveLocation/:businessAccountRef/:farmId/:areaCode/:locationCode',
  auth(),
  farmController.deleteBeeHiveLocation
);
router.get('/getFarmByFarmId/:farmId', auth(), farmController.getFarmByFarmId);
router.post('/createFarm', auth(), farmController.createFarm);
router.put('/updateFarm/:farmId', auth(), farmController.updateFarm);
router.put('/updateHive/:businessAccountRef/:farmId/:area_code/:location_code', auth(), farmController.updateHive);
router.put('/addBeeHive/:farmId', auth(), farmController.addBeeHive);
router.put('/addMultipleBeeHive', auth(), farmController.addMultipleBeeHive);
router.put('/updateMultipleHive', auth(), farmController.updateMultipleHive);
router.delete('/deleteFarm/:farmId', auth(), farmController.deleteFarm);
router.get('/getAllAreaLocationCodes/:businessAccRef/:farmId', auth(), farmController.getAllAreaLocationCodes);
router.get('/getTimeToGeneratePollinationMap/:farmId', auth(), farmController.getTimeToGeneratePollinationMap);
router.get('/generatePollinationMap/:farmId', auth(), farmController.generatePollinationMap);
router.get('/getAllFramesByFarmId/:businessAccountRef/:farmId', auth(), farmController.getAllFramesByFarmId);
router.get(
  '/getAllAreaLocationActiveFrams/:businessAccountRef/:farmId',
  auth(),
  farmController.getAllAreaLocationActiveFrams
);
router.get('/getAllDataAsList/:businessAccountRef/:farmId', auth(), farmController.getAllDataAsList);
router.get('/getAllData', farmController.getAllData);
router.get('/getAllClassCountingData/:businessAccountRef/:farmId', farmController.getAllClassCountingData);
router.get(
  '/getSpecificClassCountingData/:businessAccountRef/:farmId/:areaCode/:locationCode',
  farmController.getSpecificClassCountingData
);
router.get('/generatePollinationMapWithDateTime/:farmId', farmController.generatePollinationMapWithDateTime);
router.get('/generateFirstMap/:farmId', auth(), farmController.generateFirstMap);
router.get('/didPredictionsRunOnce/:farmId', auth(), farmController.didPredictionsRunOnce);
router.get('/getSpecificPollinationMapByDateTime/:farmId/:date/:time', farmController.getSpecificPollinationMapByDateTime);
router.get('/getLatestPollinationMapState/:farmId', farmController.getLatestPollinationMapState);
router.get('/updateSpatialProbability/:farmId', farmController.updateSpatialProbability);
router.get('/getPredictions/:farmId', farmController.getPredictions);
router.post('/canCreateMapCheck', farmController.canCreateMapCheck);
router.get('/getSpecificPredictions', farmController.getSpecificPredictions);
router.post('/getFarmsByBusinessAccounts', auth(), farmController.getFarmsByBusinessAccounts);
router.post('/getCurrentFarmsOfContractor', auth(), farmController.getCurrentFarmsOfContractor);
router.get(
  '/downloadBeehiveImages/:farmId/:businessAccRef/:areaCode/:locationCode',
  auth(),
  farmController.downloadBeehiveImages
);
router.get(
  '/generateAllPredictionsAndUpdateSpatialData/:farmId',
  auth(),
  farmController.generateAllPredictionsAndUpdateSpatialData
);
router.get(
  '/generateSpecificSpatialUpdatesAndPredictionsGeneration/:farmId/:businessAccRef/:areaCode/:locationCode',
  auth(),
  farmController.generateSpecificSpatialUpdatesAndPredictionsGeneration
);

module.exports = router;
