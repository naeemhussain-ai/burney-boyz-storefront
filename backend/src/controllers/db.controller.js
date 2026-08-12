const dbService = require('../services/db.service');

/**
 * GET /api/db-test
 * Diagnostic endpoint confirming the Neon PostgreSQL connection is alive.
 */
exports.dbTest = async (req, res, next) => {
  try {
    const time = await dbService.getServerTime();
    res.json({
      success: true,
      message: 'Database connected',
      time,
    });
  } catch (err) {
    next(err);
  }
};
