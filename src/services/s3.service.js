/* eslint-disable no-undef */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-shadow */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
});

const bucketName = process.env.BUCKET_NAME;

// Multer middleware configuration for single file upload
const addSingleMediaMiddleware = multer({
  storage: multerS3({
    s3,
    bucket: bucketName,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      cb(null, `${Date.now().toString()}-${file.originalname}`);
    },
  }),
}).single('file');

// Multer middleware configuration for multiple files upload
const addMultipleMiddleware = multer({
  storage: multerS3({
    s3,
    bucket: bucketName,
    key(req, file, cb) {
      cb(null, `${Date.now().toString()}-${file.originalname}`);
    },
  }),
}).array('files', 100); // Maximum number of files to upload at once

const addMultipleForHiveLocationMiddleware = multer({
  storage: multerS3({
    s3,
    bucket: bucketName,
    key(req, file, cb) {
      const { businessId, farmId, areaCode, locationCode } = req.query;

      const filePath = `images_${businessId}/data_${farmId}/${areaCode}/${locationCode}/${Date.now().toString()}-${
        file.originalname
      }`;

      cb(null, filePath);
    },
  }),
}).array('files', 100);

// Modified Multer middleware configuration for single file upload
const uploadSingle = (req, res, next) => {
  multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      key(req, file, cb) {
        const key = req.params.oldFileKey;
        cb(null, key);
      },
    }),
  }).single('file')(req, res, next);
};

/**
 * Fetch Media as base64 using key
 * @param {String} reportId
 * @param {Object} file
 * @returns {Promise<Subscription>}
 */
const fetchMediaBase64 = async (fileKey) => {
  const params = {
    Bucket: bucketName,
    Key: fileKey,
  };

  const data = await s3.getObject(params).promise();
  const base64Data = data.Body.toString('base64');

  return {
    data,
    base64Data,
  };
};

/**
 * Download Media
 * @param {String} url
 * @returns {Promise<Subscription>}
 */
const downloadMedia = async (url, index, tempDir) => {
  const params = {
    Bucket: bucketName,
    Key: url,
  };
  const data = await s3.getObject(params).promise();
  const ext = path.extname(url);
  const filePath = `${tempDir}/file${index}${ext}`;

  try {
    fs.writeFileSync(filePath, data.Body);
  } catch (error) {
    console.log(error);
  }

  return filePath;
};

/**
 * Delete Media
 * @param {String} url
 * @returns {Promise<void>}
 */
const deleteMedia = async (url) => {
  const params = {
    Bucket: bucketName,
    Key: url,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Deleted ${url} from ${bucketName}`);
  } catch (error) {
    console.log(`Error deleting ${url} from ${bucketName}:`, error);
  }
};

module.exports = {
  s3,
  bucketName,
  addSingleMediaMiddleware,
  addMultipleMiddleware,
  uploadSingle,
  fetchMediaBase64,
  addMultipleForHiveLocationMiddleware,
  downloadMedia,
  deleteMedia,
};
