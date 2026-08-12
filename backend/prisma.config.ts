import "dotenv/config";
import { defineConfig } from "prisma/config";

// Neon's dashboard connection strings include channel_binding=require, which
// breaks the TLS handshake for this stack (see src/config/db.js for the same
// fix applied to the raw pg pool). Strip it here too so `prisma migrate`
// works against the same DATABASE_URL.
function stripChannelBinding(raw?: string) {
  if (!raw) return raw;
  const withoutParam = raw.replace(/([?&])channel_binding=[^&]*&?/, (_match, sep) =>
    sep === "?" ? "?" : "",
  );
  return withoutParam.replace(/[?&]$/, "");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: stripChannelBinding(process.env.DATABASE_URL),
  },
});
