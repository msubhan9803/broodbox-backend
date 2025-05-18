const express = require('express');
const auth = require('../../middlewares/auth');
const { trainingController } = require('../../controllers/index');

const router = express.Router();

router.get('/getAllTrainings', auth(), trainingController.getAllTrainings);
router.post('/createTraining', auth(), trainingController.createTraining);
router.put('/updateTraining/:id', auth(), trainingController.updateTrainingHandler);
router.delete('/deleteTraining/:id', auth(), trainingController.deleteTrainingHandler);
router.get('/getTrainingById/:id', auth(), trainingController.getTrainingByIdHandler);

module.exports = router;
