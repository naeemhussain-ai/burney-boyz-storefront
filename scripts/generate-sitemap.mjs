#!/usr/bin/env node
// Build-time generator for public/robots.txt and public/sitemap.xml.
//
// Why build-time rather than a dynamic server route: this project pairs
// TanStack Start with a standalone Nitro Vite plugin in a way that made the
// framework's own server-route API (Nitro event handlers vs. TanStack
// Start server functions) ambiguous to verify without risking a silent
// 404 in production. Writing plain static files into public/ is the
// reliable, zero-risk path - Vite/Nitro serve anything in public/ as-is,
// exactly like the existing favicon.png.
//
// Run automatically via the `prebuild` npm script, or manually:
//   node scripts/generate-sitemap.mjs
//
// SITE_URL should be set to the real production origin (no trailing
// slash) - e.g. via a build-time env var on whatever host serves the
// frontend. Defaults to a placeholder if unset so local builds still work.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const SITE_URL = (process.env.SITE_URL || "https://burneyboyz.com").replace(/\/+$/, "");
const API_BASE_URL = process.env.VITE_SHOPNOW_API_BASE_URL || "http://localhost:5000/api";

// Real, DB-backed storefront pages only. Deliberately excludes the legacy
// static-demo pages (/product/$id, /category/$slug) - those aren't managed
// through the admin/DB and are still reachable by normal crawling via
// internal links, so omitting them from the sitemap is a scope choice, not
// a bug.
const STATIC_PATHS = [
  "/",
  "/shop",
  "/categories",
  "/about",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/shipping-returns",
  "/terms",
];

async function fetchProductSlugs() {
  try {
    const res = await fetch(`${API_BASE_URL}/shop/products?limit=500`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.json();
    return (body.data ?? []).map((p) => p.slug).filter(Boolean);
  } catch (err) {
    // A build must never fail because the API happened to be unreachable -
    // ship the sitemap with static pages only and move on.
    console.warn(`[sitemap] Couldn't fetch product slugs (${err.message}) - static pages only.`);
    return [];
  }
}

function urlEntry(path, { changefreq = "weekly", priority = "0.7" } = {}) {
  return `  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  const productSlugs = await fetchProductSlugs();

  const entries = [
    urlEntry("/", { changefreq: "daily", priority: "1.0" }),
    ...STATIC_PATHS.filter((p) => p !== "/").map((p) => urlEntry(p)),
    ...productSlugs.map((slug) =>
      urlEntry(`/shop/${slug}`, { changefreq: "daily", priority: "0.8" }),
    ),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /payment-success
Disallow: /payment-cancel
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${SITE_URL}/sitemap.xml
`;

  await writeFile(join(publicDir, "sitemap.xml"), sitemap, "utf8");
  await writeFile(join(publicDir, "robots.txt"), robots, "utf8");

  console.log(
    `[sitemap] Wrote public/sitemap.xml (${entries.length} urls, ${productSlugs.length} products) and public/robots.txt`,
  );
}

main();
