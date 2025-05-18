const express = require('express');
const validate = require('../../middlewares/validate');
const authValidation = require('../../validations/auth.validation');
const authController = require('../../controllers/auth.controller');
// const auth = require('../../middlewares/auth');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/resend-verification-email/:email', authController.sendVerificationEmail);
router.post('/verify-email', validate(authValidation.verifyEmail), authController.verifyEmail);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/forgot-password-token', validate(authValidation.forgotPassword), authController.forgotPasswordToken);
router.post('/forgot-password', validate(authValidation.resetPassword), authController.forgotPassword);
router.post('/reset-password-token', authController.resetPasswordToken);
router.post('/reset-password', authController.resetPassword);
router.post('/set-password', authController.setPassword);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);

module.exports = router;
