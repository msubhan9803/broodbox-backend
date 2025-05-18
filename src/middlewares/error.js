const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const config = require('../config/config');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const User = require('../models/user.model');

const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof mongoose.Error ? httpStatus.BAD_REQUEST : httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

const sendEmail = async (to, subject, html) => {
  const msg = { from: config.email.from, to, subject, html };

  await transport.sendMail(msg);
};

const sendErrorTraceEmail = async (to, error) => {
  const subject = 'Broodbox: Application Error Trace';
  const errorTrace = `
    **Application Error Report**

    **Error Details:**
    - **Message:** ${error.message || 'N/A'}
    - **Status Code:** ${error.statusCode || 'N/A'}

    **Stack Trace:**
    ${error.stack || 'No stack trace available'}

    Please review the above information to diagnose the issue. If you need further assistance, feel free to reach out.
  `;
  await sendEmail(to, subject, errorTrace);
};

const fetchAndNotifySuperAdmins = async (error) => {
  try {
    // Fetch users with role 'superAdmin'
    const superAdmins = await User.find({ role: 'superAdmin' }).exec();

    if (superAdmins.length === 0) {
      console.log('No superAdmin users found.');
      return;
    }

    // Send email to each superAdmin
    superAdmins.forEach(async (user) => {
      await sendErrorTraceEmail(user.email, error);
      console.log(`Email sent to ${user.email}`);
    });
  } catch (err) {
    console.error('Error fetching or notifying superAdmins:', error);
  }
};

// eslint-disable-next-line no-unused-vars
const errorHandler = async (err, req, res, next) => {
  let { statusCode, message } = err;
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR];
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') {
    logger.error(err);
  }

  await fetchAndNotifySuperAdmins(err);

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
