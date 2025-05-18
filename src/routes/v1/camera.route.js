/* eslint-disable prettier/prettier */
const express = require('express');
const auth = require('../../middlewares/auth');
const { cameraController } = require('../../controllers/index');

const router = express.Router();

router.get('/getAllCameras', auth(), cameraController.getAllCameras);
router.post('/createCamera', auth(), cameraController.createCamera);
router.put('/updateCamera/:id', auth(), cameraController.updateCameraHandler);
router.delete('/deleteCamera/:id', auth(), cameraController.deleteCameraHandler);
router.get('/getCameraById/:id', auth(), cameraController.getCameraByIdHandler);
router.get('/getUniqueCameraId', auth(), cameraController.getUniqueCameraId);

module.exports = router;
