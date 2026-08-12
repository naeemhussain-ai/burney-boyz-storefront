// Admin Access Requests. Reviews requests submitted via the separate
// /register-admin flow (see auth.service.js#registerAdminRequest) - not
// related to normal customer registration. isAdmin (see auth.middleware.js's
// requireAdmin) is the only field that actually grants access; everything
// in this file is bookkeeping/notification around that one decision.
const prisma = require('../config/prisma');
const emailService = require('./email.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

const SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isAdmin: true,
  adminRequestStatus: true,
  adminRequestedAt: true,
  adminDecidedAt: true,
  createdAt: true,
};

async function listRequests({ status = 'pending' } = {}) {
  const where = status === 'all' ? {} : { adminRequestStatus: status };
  return prisma.user.findMany({
    where,
    select: SAFE_SELECT,
    orderBy: { adminRequestedAt: 'desc' },
  });
}

async function decideRequest(userId, approve) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError(`User ${userId} not found`);
  if (user.adminRequestStatus !== 'pending') {
    throw new ValidationError(`This request has already been ${user.adminRequestStatus}`);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isAdmin: approve,
      adminRequestStatus: approve ? 'approved' : 'declined',
      adminDecidedAt: new Date(),
    },
    select: SAFE_SELECT,
  });

  emailService.notifyAdminAccessDecided(updated, approve);

  return updated;
}

module.exports = { listRequests, decideRequest };
