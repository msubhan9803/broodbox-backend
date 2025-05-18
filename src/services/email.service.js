const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const config = require('../config/config');
const logger = require('../config/logger');

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, html) => {
  const msg = { from: config.email.from, to, subject, html };

  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendForgotPasswordEmail = async (to, token) => {
  const subject = 'Forgot password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To change your password, click on this link: ${resetPasswordUrl}
If you did not request any password change, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  const jwt = {
    jwt_token: token,
    url: process.env.FRONTEND_URL,
    email: to,
  };
  ejs.renderFile(path.join(__dirname, '..', 'templates', 'verificationEmail.ejs'), jwt, async (err, data) => {
    if (err) throw err;
    await sendEmail(to, subject, data);
  });
};

const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';

  const jwt = {
    jwt_token: token,
    url: process.env.FRONTEND_URL,
    email: to,
  };
  ejs.renderFile(path.join(__dirname, '..', 'templates', 'resetPasswordEmail.ejs'), jwt, async (err, data) => {
    if (err) throw err;
    await sendEmail(to, subject, data);
  });
};

/**
 * Send error trace
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendErrorTraceEmail = async (to, error) => {
  const subject = 'Broodbox: Application Error Trace';
  const errorTrace = `
    An error occurred in the application:

    ${error.stack}

    Status code: ${error.statusCode || 'N/A'}
    Body: ${JSON.stringify(error.message) || 'N/A'}
  `;

  await sendEmail(to, subject, errorTrace);
};

module.exports = {
  transport,
  sendEmail,
  sendForgotPasswordEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendErrorTraceEmail,
};
