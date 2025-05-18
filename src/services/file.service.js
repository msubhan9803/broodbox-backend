const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

/**
 * Create Temp Directory
 * @returns {Promise<String>}
 */
const createTempDirectory = () => {
  const timestamp = Date.now();
  const tempDir = `./temp-${timestamp}`;

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  return tempDir;
};

/**
 * Create Zip Archive
 * @param {Array<String>} filePaths
 * @param {String} zipFilePath
 * @returns {Promise}
 */
const createZipArchive = (filePaths, zipFilePath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Compression level
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    filePaths.forEach((filePath) => {
      archive.append(fs.createReadStream(filePath), { name: path.basename(filePath) });
    });

    archive.finalize();
  });
};

/**
 * Delete Temp Dir
 * @returns {Promise>}
 */
const deleteTempDir = (tempDir) => {
  fs.readdirSync(tempDir).forEach((file) => {
    fs.unlinkSync(path.join(tempDir, file));
  });
  fs.rmdirSync(tempDir);
};

module.exports = {
  createTempDirectory,
  createZipArchive,
  deleteTempDir,
};
