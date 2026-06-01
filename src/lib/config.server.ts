import "@/lib/load-env.server";

import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

/** URL do MySQL — prioriza DB_* para senha e usuário ficarem em um só lugar. */
export function getDatabaseUrl(): string | undefined {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME?.trim();

  if (host && user && password !== undefined && password !== "" && name) {
    const port = process.env.DB_PORT?.trim() || "3306";
    const userEnc = encodeURIComponent(user);
    const passEnc = encodeURIComponent(password);
    const nameEnc = encodeURIComponent(name);
    return `mysql://${userEnc}:${passEnc}@${host}:${port}/${nameEnc}`;
  }

  return process.env.DATABASE_URL?.trim() || undefined;
}

export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || undefined;
}

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: getDatabaseUrl(),
    authSecret: getAuthSecret(),
  };
}
