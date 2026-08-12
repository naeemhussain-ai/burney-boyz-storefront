const axios = require('axios');
const { fromAxiosError, unwrapCjResponse, AuthenticationError } = require('./errors');
const { throttledCjCall } = require('./cjThrottle');

// ─── In-memory token store ────────────────────────────────────────────────────
// Survives the process lifetime; re-fetched on cold start or expiry.
const store = {
  accessToken: null,
  accessTokenExpiryDate: null,
  refreshToken: null,
  refreshTokenExpiryDate: null,
};

// Refresh 1 hour before the token actually expires to avoid clock-skew issues.
const BUFFER_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = Number(process.env.CJ_TIMEOUT_MS) || 15000;
const isDev = () => process.env.NODE_ENV === 'development';

function expiresAt(dateStr) {
  return dateStr ? new Date(dateStr).getTime() : 0;
}

function isValid(expiryDateStr) {
  return expiresAt(expiryDateStr) - Date.now() > BUFFER_MS;
}

// Never log a full token - only enough to confirm one was issued.
function mask(token) {
  return token ? `${token.slice(0, 12)}…(${token.length} chars)` : null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchNewToken() {
  const url = `${process.env.CJ_BASE_URL}/authentication/getAccessToken`;
  const payload = { apiKey: process.env.CJ_API_KEY };

  if (isDev()) console.log('[CJ Auth] Requesting new access token via apiKey');

  let body;
  try {
    ({ data: body } = await throttledCjCall(() => axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    })));
  } catch (err) {
    throw fromAxiosError(err);
  }

  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ getAccessToken failed' });
  if (isDev()) console.log('[CJ Auth] New token issued:', mask(data.accessToken), '| expires', data.accessTokenExpiryDate);

  return data;
}

async function doRefresh() {
  const url = `${process.env.CJ_BASE_URL}/authentication/refreshAccessToken`;
  const payload = { refreshToken: store.refreshToken };

  if (isDev()) console.log('[CJ Auth] Refreshing access token...');

  let body;
  try {
    ({ data: body } = await throttledCjCall(() => axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    })));
  } catch (err) {
    throw fromAxiosError(err);
  }

  const data = unwrapCjResponse(body, { fallbackMessage: 'CJ refreshAccessToken failed' });
  if (isDev()) console.log('[CJ Auth] Refreshed token:', mask(data.accessToken), '| expires', data.accessTokenExpiryDate);

  return data;
}

function saveToStore(data) {
  store.accessToken = data.accessToken;
  store.accessTokenExpiryDate = data.accessTokenExpiryDate;
  store.refreshToken = data.refreshToken;
  store.refreshTokenExpiryDate = data.refreshTokenExpiryDate;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a valid CJ access token, fetching or refreshing transparently.
 *
 * Decision tree:
 *  1. Access token still valid           → return cached token
 *  2. Access token expiring, refresh OK  → refresh and return new token
 *  3. Both expired / no token at all     → fetch fresh token with apiKey
 */
async function getToken() {
  if (!process.env.CJ_API_KEY) {
    throw new AuthenticationError('CJ_API_KEY is not set in .env');
  }

  // Case 1: access token still good
  if (store.accessToken && isValid(store.accessTokenExpiryDate)) {
    return store.accessToken;
  }

  // Case 2: try refresh before going back to full apiKey auth
  if (store.refreshToken && isValid(store.refreshTokenExpiryDate)) {
    try {
      const data = await doRefresh();
      saveToStore(data);
      return store.accessToken;
    } catch (err) {
      if (isDev()) console.warn('[CJ Auth] Refresh failed, falling back to apiKey auth:', err.message);
    }
  }

  // Case 3: fetch a completely new token
  const data = await fetchNewToken();
  saveToStore(data);
  return store.accessToken;
}

/**
 * Returns diagnostic token info (for the /api/token health endpoint).
 * The token itself is masked - this is a diagnostic endpoint, not a token vendor.
 */
function getTokenInfo() {
  return {
    hasToken: Boolean(store.accessToken),
    accessTokenPreview: mask(store.accessToken),
    accessTokenExpiryDate: store.accessTokenExpiryDate,
    refreshTokenExpiryDate: store.refreshTokenExpiryDate,
  };
}

module.exports = { getToken, getTokenInfo };
