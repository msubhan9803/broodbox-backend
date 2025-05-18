/* eslint-disable no-cond-assign */

const parseListOfTuples = (listOfTuples) => {
  const boundaryString = listOfTuples;
  const regex = /\(([^)]+)\)/g;
  let matches;
  const tuples = [];
  while ((matches = regex.exec(boundaryString))) {
    tuples.push(matches[1].split(',').map(Number));
  }
  const boundaries = tuples.map(([lat, lng]) => ({ lat, lng }));

  return boundaries;
};

function convertTupleToArray(tupleString) {
  // Remove the surrounding square brackets and split the string by commas
  const urls = tupleString.slice(1, -1).split(', ');

  // Return the array of URLs
  return urls;
}

const convertToListOfTuples = (listOfObjects) => {
  const pythonTupleArray = listOfObjects.map((obj) => `(${obj.lat},${obj.lng})`).join(', ');
  const pythonTupleString = `[${pythonTupleArray}]`;

  return pythonTupleString;
};

// console.log(convertListOfStringsToPythonTupleString(["subhan", "imran"]));
const convertListOfStringsToPythonTupleString = (listOfStrings) => {
  const pythonTupleString = `[${listOfStrings.map((str) => `'${str}'`).join(', ')}]`;
  return pythonTupleString;
};

module.exports = {
  parseListOfTuples,
  convertTupleToArray,
  convertToListOfTuples,
  convertListOfStringsToPythonTupleString,
};
