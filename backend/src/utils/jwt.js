// Thin wrappers around jsonwebtoken so every call site shares one secret
// source, one expiry, and one error type on failure.
const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errors');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

function signToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  if (!SECRET) throw new Error('JWT_SECRET is not set');
  try {
    return jwt.verify(token, SECRET);
  } catch {
    throw new AuthenticationError('Invalid or expired session - please log in again');
  }
}

module.exports = { signToken, verifyToken };
