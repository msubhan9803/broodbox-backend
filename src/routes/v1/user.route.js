const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');
const s3Service = require('../../services/s3.service');

const router = express.Router();

router.get('/getAllUsers', auth(), userController.getAllUsers);
router.get('/getUserById/:userId', auth(), validate(userValidation.getUserById), userController.getUserById);
router.get('/getBusinessAccounts', auth(), userController.getBusinessAccounts);
router.post('/createUser', auth(), userController.createUser);
router.post('/updateCoverImg', auth(), s3Service.addSingleMediaMiddleware, userController.updateCoverImg);
router.put('/updateUser', auth(), userController.updateUser);
router.put('/updateUserById', auth(), userController.updateUserById);
router.put('/toggleUserAccountStatus/:userId', auth(), userController.toggleUserAccountStatus);
router.put('/toggleUserEmailVerification/:userId', auth(), userController.toggleUserEmailVerification);
router.get('/getAllUsersByRole/:role', auth(), userController.getAllUsersByRole);
router.delete('/deleteUser/:userId', auth(), validate(userValidation.deleteUser), userController.deleteUser);
router.delete(
  '/deleteBusinessAccountPermanantly/:businessAccountRef',
  auth(),
  userController.deleteBusinessAccountPermanantly
);
router.post(
  '/toggleBusinessAccountArchiveStatus/:businessAccountRef',
  auth(),
  userController.toggleBusinessAccountArchiveStatus
);

module.exports = router;
