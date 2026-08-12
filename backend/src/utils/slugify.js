// Converts a product name into a URL/SEO-safe slug.
// "Luxury Watch" -> "luxury-watch"

function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip accents left over from NFKD normalization
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { slugify };
