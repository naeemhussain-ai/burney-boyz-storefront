// Sets a Cache-Control header for read-only, non-personalized responses.
// Only ever applied to public catalog reads (see shop.routes.js) - never to
// cart/orders/account/admin/auth, which must always be fresh/private.
function cacheControl(seconds) {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=300`);
    next();
  };
}

module.exports = { cacheControl };
