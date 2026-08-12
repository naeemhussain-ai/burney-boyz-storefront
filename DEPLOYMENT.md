# Deployment Guide

This project has two independently deployable pieces:

- **Frontend** - TanStack Start (React 19 + Vite + Nitro, `vercel` preset). Already configured for Vercel via `vercel.json` + the Nitro plugin in `vite.config.ts`.
- **Backend** - Express + Prisma API (`backend/`). No deployment config exists yet for it - it needs any standard Node host (Render, Railway, Fly.io, a VPS, etc.). This guide keeps that choice open rather than assuming one.
- **Database** - Neon Postgres, already cloud-hosted; nothing to deploy.

## 1. Database (Neon)

Already provisioned - `DATABASE_URL` in `backend/.env` points at it. Before a production deploy:

- Run any pending migrations against production: `cd backend && npx prisma migrate deploy`.
- Confirm the Neon connection string used in production has `sslmode=require` (it does) and that `channel_binding` is stripped if present - see the comment in `backend/src/config/db.js` and `backend/prisma.config.ts` for why.

## 2. Backend (Express API)

Pick any Node 18+ host. General steps:

1. Deploy the `backend/` directory (or its own repo/subtree) with `npm install && npm start`.
2. Set these environment variables on the host (see `backend/.env.example`-equivalent - there's no committed example file yet, mirror `backend/.env`'s keys):

   | Variable | Required | Notes |
   |---|---|---|
   | `PORT` | No | Defaults to 5000; most hosts inject their own. |
   | `NODE_ENV` | Yes | Set to `production`. |
   | `DATABASE_URL` | Yes | Neon connection string. |
   | `CJ_API_KEY`, `CJ_BASE_URL` | Yes | CJ Dropshipping product import. |
   | `STRIPE_SECRET_KEY` | Yes | **Currently unset even in dev** - get a live key from the Stripe dashboard before accepting real payments. |
   | `FRONTEND_URL` | Yes | The deployed frontend's origin (used for Stripe redirect URLs and password-reset links). |
   | `JWT_SECRET` | Yes | Rotate the dev value in `backend/.env` - generate a fresh random secret for production, don't reuse it. |
   | `RESEND_API_KEY` | Recommended | Unset = emails are logged, not sent. Get one from resend.com. |
   | `RESEND_FROM_EMAIL` | Recommended | Must be a Resend-verified sender/domain once you have a real key (the sandbox default only works for testing). |
   | `ADMIN_NOTIFICATION_EMAIL` | Recommended | Where new-order alerts go. |

3. Confirm CORS: `app.js` currently uses `cors()` with no origin restriction (allows all). Fine for launch, but consider locking it to `FRONTEND_URL` once the production domain is final.
4. Confirm rate limiting/security headers are active by default (added in this step - no config needed) - spot check with `curl -I` against a couple of routes after deploy.

## 3. Frontend (Vercel)

Already wired for Vercel's Build Output API via the Nitro `vercel` preset:

1. Connect the repo to Vercel (or run `npx vercel deploy --prebuilt` after `npm run build` locally/in CI).
2. Set `VITE_SHOPNOW_API_BASE_URL` to the deployed backend's `/api` URL (e.g. `https://api.yourdomain.com/api`) - every `src/api/*.ts` module falls back to `http://localhost:5000/api` otherwise, which only works locally.
3. Set `SITE_URL` (build-time env var) to the real production origin - used by `scripts/generate-sitemap.mjs` (runs automatically via the `prebuild` npm script) to write correct absolute URLs into `public/sitemap.xml` and `public/robots.txt`. Without it, those files default to `https://burneyboyz.com`, which is a placeholder, not a confirmed domain.
4. `vercel.json`'s `buildCommand`/`installCommand`/`outputDirectory` are already correct - no changes needed there.

## 4. Post-deploy verification

- `curl -I https://<frontend>/assets/<any-hashed-file>` → expect `cache-control: public, max-age=31536000, immutable`.
- `curl -I https://<frontend>/` → expect `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` present.
- `curl https://<frontend>/robots.txt` and `/sitemap.xml` → confirm the domain in both matches production, not the placeholder.
- `curl -I https://<backend>/api/shop/products` → expect `cache-control: public, max-age=60, ...`, and Helmet/compression headers.
- Place one real test order end-to-end (Stripe test mode is fine) and confirm all 4 email triggers fire - check Resend's dashboard (or the server logs, if `RESEND_API_KEY` is still unset).
- Re-run through the full user flow once: browse → cart → checkout → account login → admin dashboard/orders.

## 5. Known gaps to close before going fully live

See `PRODUCTION_READINESS.md` for the full list - the two most important:

- **`/admin/*` has no authentication.** Anyone with the URL can view/edit orders and products. Gate it behind the auth system built in Step 10 (e.g. an `isAdmin` flag on `User` + a `RequireAdmin` guard) before this is public.
- **No Content-Security-Policy.** Deliberately deferred - needs a careful audit of every external resource (Google Fonts, the CJ image CDN, Stripe) so a rushed policy doesn't break image loading or fonts.
