const express = require('express');
const s3Controller = require('../../controllers/s3.controller');
const s3Service = require('../../services/s3.service');

const router = express.Router();

router.get('/getMedia/:fileKey', s3Controller.getMedia);
router.get('/getChildMedia/:businessId/:farmId/:areaCode/:locationCode/:fileName', s3Controller.getChildMedia);
router.post('/addMedia', s3Service.addSingleMediaMiddleware, s3Controller.addMedia);
router.post('/addMultipleMedia', s3Service.addMultipleMiddleware, s3Controller.addMultipleMedia);
router.post(
  '/addMultipleMediaForHiveLocation',
  s3Service.addMultipleForHiveLocationMiddleware,
  s3Controller.addMultipleMediaForHiveLocation
);
router.put('/updateMedia/:oldFileKey', s3Controller.updateMedia);

module.exports = router;
