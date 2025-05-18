const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');

const register = catchAsync(async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
    await emailService.sendVerificationEmail(req.body.email, verifyEmailToken);

    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.CREATED).send({ user, tokens });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const login = catchAsync(async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUserWithEmailAndPassword(email, password);
    const tokens = await tokenService.generateAuthTokens(user);
    res.send({ user, tokens });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const logout = catchAsync(async (req, res) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const refreshTokens = catchAsync(async (req, res) => {
  try {
    const tokens = await authService.refreshAuth(req.body.refreshToken);
    res.send({ ...tokens });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const forgotPasswordToken = catchAsync(async (req, res) => {
  try {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
    await emailService.sendForgotPasswordEmail(req.body.email, resetPasswordToken);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const forgotPassword = catchAsync(async (req, res) => {
  try {
    await authService.forgotPassword(req.query.token, req.body.password);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const resetPasswordToken = catchAsync(async (req, res) => {
  try {
    const user = await userService.getUserByEmail(req.query.email);
    const token = await tokenService.generatesetPasswordToken(user);
    await emailService.sendResetPasswordEmail(req.query.email, token);
    res.status(httpStatus.NO_CONTENT).send(`Reset Password Token sent to: ${req.query.email}`);
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const resetPassword = catchAsync(async (req, res) => {
  try {
    await authService.resetPassword(req.body._id, req.body.oldPassword, req.body.newPassword);
    res.status(httpStatus.NO_CONTENT).send({ success: true });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const setPassword = catchAsync(async (req, res) => {
  try {
    await authService.setPassword(req.query.token, req.body.password, req.body.confirmPassword);
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  try {
    const user = await userService.getUserByEmail(req.params.email);
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
    await emailService.sendVerificationEmail(user.email, verifyEmailToken);
    res.status(httpStatus.NO_CONTENT).send({ success: true });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

const verifyEmail = catchAsync(async (req, res) => {
  try {
    const user = await authService.verifyEmail(req.query.token);
    const setPasswordToken = await tokenService.generatesetPasswordToken(user);
    res.status(httpStatus.OK).send({ setPasswordToken });
  } catch (error) {
    res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).send({ error: error.message });
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  forgotPasswordToken,
  resetPasswordToken,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  setPassword,
};
