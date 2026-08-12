// Consistent response envelope used by every endpoint in the API:
// { success, message, data, pagination, meta }

function sendSuccess(res, { status = 200, message = 'Success', data = null, pagination = null, meta = {} } = {}) {
  res.status(status).json({
    success: true,
    message,
    data,
    pagination,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
}

module.exports = { sendSuccess };
