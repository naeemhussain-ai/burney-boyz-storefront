const accountService = require('../services/account.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/account/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await accountService.getProfile(req.user.id);
    sendSuccess(res, { message: 'Profile retrieved successfully', data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/account/profile
 * Body: { firstName?, lastName?, phone? }
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body || {};
    const user = await accountService.updateProfile(req.user.id, { firstName, lastName, phone });
    sendSuccess(res, { message: 'Profile updated successfully', data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/account/password
 * Body: { currentPassword, newPassword }
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    await accountService.changePassword(req.user.id, { currentPassword, newPassword });
    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/account/addresses
 */
exports.listAddresses = async (req, res, next) => {
  try {
    const addresses = await accountService.listAddresses(req.user.id);
    sendSuccess(res, { message: 'Addresses retrieved successfully', data: addresses });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/account/addresses
 */
exports.createAddress = async (req, res, next) => {
  try {
    const address = await accountService.createAddress(req.user.id, req.body || {});
    sendSuccess(res, { status: 201, message: 'Address added successfully', data: address });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/account/addresses/:id
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const address = await accountService.updateAddress(req.user.id, req.params.id, req.body || {});
    sendSuccess(res, { message: 'Address updated successfully', data: address });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/account/addresses/:id
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    await accountService.deleteAddress(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Address removed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/account/addresses/:id/default
 */
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const addresses = await accountService.setDefaultAddress(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Default address updated', data: addresses });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/account/orders?page=&limit=
 */
exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const { orders, pagination } = await accountService.listOrdersForUser(req.user.email, { page, limit });
    sendSuccess(res, {
      message: 'Orders retrieved successfully',
      data: orders,
      pagination,
      meta: { count: orders.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/account/orders/:id
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await accountService.getOrderForUser(req.params.id, req.user.email);
    sendSuccess(res, { message: 'Order retrieved successfully', data: order });
  } catch (err) {
    next(err);
  }
};
