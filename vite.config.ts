import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

// The backend API can live on a different origin in production (this repo
// deploys frontend and backend separately - see backend/.env's FRONTEND_URL/
// CORS_ORIGINS side of the same relationship). Resolve it once at build
// time so connect-src can allow exactly that origin instead of a wildcard.
//
// Vite only auto-exposes .env files to client code via import.meta.env -
// this config file runs in Node and needs loadEnv() to see .env.local too;
// real process.env (e.g. Vercel's injected build-time vars) still wins.
const env = { ...loadEnv("", process.cwd(), ""), ...process.env };
const apiBaseUrl = env.VITE_SHOPNOW_API_BASE_URL || "http://localhost:5000/api";
let apiOrigin = "http://localhost:5000";
try {
  apiOrigin = new URL(apiBaseUrl).origin;
} catch {
  // keep the localhost fallback above if the env var is malformed
}

// Product/CJ/CDN images come from whichever warehouse/CDN host CJ happens to
// return for a given supplier (varies per product, not a fixed domain list) -
// so img-src is scoped to https: rather than an explicit host allowlist.
// Every other directive is scoped as tightly as the app's actual resource
// usage allows: Google Fonts stylesheet/font files, our own API origin, and
// 'unsafe-inline' for script/style only because TanStack Start's SSR
// hydration barrier ships as an inline <script> and Radix UI sets inline
// style attributes on portaled elements - both are required for the app to
// hydrate/render at all, confirmed by inspecting actual SSR output.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(), // must come before viteReact()
    viteReact(),
    nitro({
      preset: "vercel",
      compatibilityDate: "2025-01-01",
      // Applied by Nitro at build time regardless of deploy target, so
      // these survive even though outputDirectory is a pre-built Vercel
      // Build Output API bundle (vercel.json's own `headers` array isn't
      // guaranteed to apply on top of that). Content-hashed Vite assets are
      // safe to cache forever; the rest are baseline security headers.
      routeRules: {
        "/assets/**": {
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/**": {
          headers: {
            "x-content-type-options": "nosniff",
            "x-frame-options": "SAMEORIGIN",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "camera=(), microphone=(), geolocation=()",
            "content-security-policy": CSP,
          },
        },
      },
    }),
  ],
});
