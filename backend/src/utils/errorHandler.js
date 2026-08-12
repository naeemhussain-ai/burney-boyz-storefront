const { AppError } = require('./errors');

// Centralized error handler. Every controller funnels errors here via next(err)
// instead of hand-rolling status/body extraction per-route.
module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err instanceof AppError ? err.status : err.status || 500;
  const message = err.message || 'Internal Server Error';
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.error(`[Error] ${req.method} ${req.originalUrl} -> ${status} ${message}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`[Error] ${err.name || 'Error'}: ${message}`);
  }

  res.status(status).json({
    success: false,
    message,
    data: null,
    pagination: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...(isDev && err.code !== undefined ? { cjCode: err.code } : {}),
    },
  });
};
