// Maps the country names our checkout/address forms store (free text from a
// fixed <Select> list - see src/routes/checkout.tsx#COUNTRIES on the
// frontend) to ISO alpha-2 codes, which is what CJ's order API requires for
// shippingCountryCode. Extend this map if that list grows.
const COUNTRY_NAME_TO_ISO2 = {
  'United States': 'US',
  Canada: 'CA',
  'United Kingdom': 'GB',
  Australia: 'AU',
  Pakistan: 'PK',
  India: 'IN',
  'United Arab Emirates': 'AE',
  Germany: 'DE',
  France: 'FR',
  Netherlands: 'NL',
};

/** Returns an ISO alpha-2 code for a stored country value, or null if unknown. */
function toIso2(countryName) {
  if (!countryName) return null;
  const trimmed = String(countryName).trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase(); // already a code
  return COUNTRY_NAME_TO_ISO2[trimmed] || null;
}

module.exports = { toIso2, COUNTRY_NAME_TO_ISO2 };
