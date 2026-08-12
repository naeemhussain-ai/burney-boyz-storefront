// Signed-in customer dashboard: profile, password change, address book, and
// order history. Order history is matched by email against the existing
// guest-checkout Order rows (see order.service.js) - deliberately queried
// directly here rather than through order.service.js, so nothing about
// ShopNow's checkout/order-creation path is touched by this feature.
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sanitizeUser } = require('./auth.service');
const cjOrderService = require('./cjOrder.service');
const { ValidationError, NotFoundError, AuthenticationError } = require('../utils/errors');

const BCRYPT_ROUNDS = 10;
const ORDER_INCLUDE = { items: true };

// --- Profile ---------------------------------------------------------

async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');
  return sanitizeUser(user);
}

async function updateProfile(userId, { firstName, lastName, phone }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      phone: phone?.trim() || null,
    },
  });
  return sanitizeUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!newPassword || String(newPassword).length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcrypt.compare(currentPassword || '', user.passwordHash);
  if (!valid) throw new AuthenticationError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// --- Addresses ---------------------------------------------------------

const REQUIRED_ADDRESS_FIELDS = ['fullName', 'addressLine1', 'country', 'state', 'city', 'postalCode'];

function validateAddressInput(input) {
  const missing = REQUIRED_ADDRESS_FIELDS.filter((f) => !input?.[f] || !String(input[f]).trim());
  if (missing.length) {
    throw new ValidationError(`Address missing: ${missing.join(', ')}`);
  }
}

async function assertOwnedAddress(userId, addressId) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new NotFoundError(`Address ${addressId} not found`);
  }
  return address;
}

async function listAddresses(userId) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

async function createAddress(userId, input) {
  validateAddressInput(input);

  const data = {
    userId,
    label: input.label?.trim() || null,
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    addressLine1: input.addressLine1.trim(),
    addressLine2: input.addressLine2?.trim() || null,
    country: input.country.trim(),
    state: input.state.trim(),
    city: input.city.trim(),
    postalCode: input.postalCode.trim(),
  };

  // First address for a user becomes the default automatically.
  const existingCount = await prisma.address.count({ where: { userId } });
  if (existingCount === 0 || input.isDefault) {
    return setDefaultAfterCreate(userId, data);
  }

  return prisma.address.create({ data });
}

async function setDefaultAfterCreate(userId, data) {
  return prisma.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, isDefault: true } });
  });
}

async function updateAddress(userId, addressId, input) {
  await assertOwnedAddress(userId, addressId);
  validateAddressInput(input);

  return prisma.address.update({
    where: { id: addressId },
    data: {
      label: input.label?.trim() || null,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2?.trim() || null,
      country: input.country.trim(),
      state: input.state.trim(),
      city: input.city.trim(),
      postalCode: input.postalCode.trim(),
    },
  });
}

async function deleteAddress(userId, addressId) {
  await assertOwnedAddress(userId, addressId);
  await prisma.address.delete({ where: { id: addressId } });
}

async function setDefaultAddress(userId, addressId) {
  await assertOwnedAddress(userId, addressId);

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);

  return listAddresses(userId);
}

// --- Orders (read-only, matched by email) -------------------------------

async function listOrdersForUser(email, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerEmail: email },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      include: ORDER_INCLUDE,
    }),
    prisma.order.count({ where: { customerEmail: email } }),
  ]);

  return {
    orders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

async function getOrderForUser(id, email) {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order || order.customerEmail !== email) {
    throw new NotFoundError(`Order ${id} not found`);
  }

  // Sprint 7 / Step 19 - "Customer Dashboard should always display the
  // latest CJ shipping status": lazily refresh on view (throttled
  // internally, never breaks the page on a CJ hiccup).
  const synced = await cjOrderService.syncCjOrderStatusSafely(id);
  return synced || order;
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  listOrdersForUser,
  getOrderForUser,
};
