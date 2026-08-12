const adminAccessService = require('../services/adminAccess.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/admin/access-requests?status=pending|approved|declined|all
 */
exports.listRequests = async (req, res, next) => {
  try {
    const requests = await adminAccessService.listRequests({ status: req.query.status });
    sendSuccess(res, { message: 'Access requests retrieved successfully', data: requests });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/access-requests/:id/approve
 */
exports.approveRequest = async (req, res, next) => {
  try {
    const user = await adminAccessService.decideRequest(req.params.id, true);
    sendSuccess(res, { message: `${user.email} now has admin access`, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/access-requests/:id/decline
 */
exports.declineRequest = async (req, res, next) => {
  try {
    const user = await adminAccessService.decideRequest(req.params.id, false);
    sendSuccess(res, { message: `${user.email}'s request was declined`, data: user });
  } catch (err) {
    next(err);
  }
};
