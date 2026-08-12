// Centralized error types. Every thrown error in this app should be one of
// these so the global error handler can derive a correct HTTP status without
// re-parsing axios/CJ error shapes at every call site.

class AppError extends Error {
  constructor(message, status = 500, code) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

class PaymentRequiredError extends AppError {
  constructor(message = 'Payment has not been completed') {
    super(message, 402);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'CJ Dropshipping authentication failed') {
    super(message, 401);
  }
}

// Sprint 10 / Step 24 - Admin Security. Distinct from AuthenticationError
// (401, "who are you") - this is 403 ("I know who you are, but you can't do
// this"), thrown by requireAdmin for a valid customer JWT that isn't an admin.
class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super(message, 403);
  }
}

class CJApiError extends AppError {
  constructor(message, status = 502, code) {
    super(message, status, code);
  }
}

class TimeoutError extends AppError {
  constructor(message = 'Request to CJ Dropshipping API timed out') {
    super(message, 504);
  }
}

class NetworkError extends AppError {
  constructor(message = 'Network error contacting CJ Dropshipping API') {
    super(message, 502);
  }
}

// Not-found detection for CJ's free-text messages (there is no dedicated
// error code for "product/category doesn't exist" - it comes back as
// result:false with a human-readable message).
const NOT_FOUND_PATTERN = /not found|not exist|does not exist|no data/i;

/**
 * Converts a raw axios error (thrown by any direct axios call to CJ) into a
 * typed AppError. Use at every point an axios call touches the CJ API.
 */
function fromAxiosError(err) {
  if (err instanceof AppError) return err;

  if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message)) {
    return new TimeoutError();
  }

  if (!err.response) {
    return new NetworkError(err.message);
  }

  const { status, data: body } = err.response;
  const message = body?.message || err.message;

  if (status === 401 || status === 403) {
    return new AuthenticationError(message);
  }

  return new CJApiError(message, status, body?.code);
}

/**
 * Unwraps a CJ response envelope ({ result, data, message, code }).
 * Returns body.data on success, throws a typed AppError otherwise.
 */
function unwrapCjResponse(body, { fallbackMessage = 'CJ API request failed' } = {}) {
  if (body && body.result && body.data !== undefined && body.data !== null) {
    return body.data;
  }

  const message = body?.message || fallbackMessage;
  const status = NOT_FOUND_PATTERN.test(message) ? 404 : 502;
  throw new CJApiError(message, status, body?.code);
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  PaymentRequiredError,
  AuthenticationError,
  AuthorizationError,
  CJApiError,
  TimeoutError,
  NetworkError,
  fromAxiosError,
  unwrapCjResponse,
};
