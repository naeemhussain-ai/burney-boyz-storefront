// HTTP request logger - replaced the old dev-only console.log version with
// the structured logger so every request is captured consistently across
// environments. Production outputs JSON-lines; development keeps coloured
// human-readable output.

const logger = require('./logger');

module.exports = function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      statusCode: res.statusCode,
      durationMs: duration,
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.originalUrl} → ${res.statusCode}`, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} → ${res.statusCode}`, meta);
    } else {
      logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`, meta);
    }
  });

  next();
};
