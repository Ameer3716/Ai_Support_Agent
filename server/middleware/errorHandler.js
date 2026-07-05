const logger = require('../utils/logger');
const { config } = require('../config');

function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    logger.error('Unhandled error', { message: err.message, path: req.originalUrl });
  } else {
    logger.warn('Request error', { message: err.message, path: req.originalUrl });
  }

  // Multer's file-too-large error, surfaced with a friendlier message.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large (max 15MB).' });
  }

  const message = status >= 500 && config.nodeEnv === 'production' ? 'Something went wrong on our end.' : err.message;

  res.status(status).json({ error: message || 'Unexpected error.' });
}

module.exports = { notFoundHandler, errorHandler };
