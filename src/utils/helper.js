const mongoose = require('mongoose');

const removeIds = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      removeIds(item);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    delete obj._id;

    Object.values(obj).forEach((value) => {
      removeIds(value);
    });
  }
};

const isObjectEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

const convertToObjectId = (val) => {
  return typeof val === 'string' ? mongoose.Types.ObjectId(val) : val;
};

const convertStringToArray = (urlString) => {
  // If the string is empty or contains only square brackets, return an empty array
  if (!urlString || urlString === '[]' || urlString.trim() === '') {
    return [];
  }

  // Remove square brackets and split the string into an array
  let urlArray = urlString.substring(1, urlString.length - 1).split(',');

  // Trim extra spaces
  urlArray = urlArray.map((url) => url.trim());

  return urlArray;
};

module.exports = {
  removeIds,
  isObjectEmpty,
  convertToObjectId,
  convertStringToArray,
};
