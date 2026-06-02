import { createFileRoute } from "@tanstack/react-router";

import { getAuthSecret, getDatabaseUrl } from "@/lib/config.server";
import { jsonResponse } from "@/lib/http.server";

/** Diagnóstico (sem expor segredos) — abra /api/health no site publicado. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const auth = Boolean(getAuthSecret());
        const db = Boolean(getDatabaseUrl());
        return jsonResponse({
          ok: auth && db,
          config: {
            auth_secret: auth,
            database: db,
            node_env: process.env.NODE_ENV ?? "unknown",
            vercel: Boolean(process.env.VERCEL),
          },
          hint: !auth
            ? "Cadastre AUTH_SECRET na Vercel (Production + Preview), salve e faça Redeploy."
            : !db
              ? "Cadastre DB_HOST, DB_USER, DB_PASSWORD e DB_NAME na Vercel e redeploy."
              : null,
        });
      },
    },
  },
});
