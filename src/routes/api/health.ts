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
        const envPresent = (name: string) => {
          const value = process.env[name];
          return value !== undefined && value !== "";
        };
        return jsonResponse({
          ok: auth && db,
          config: {
            auth_secret: auth,
            database: db,
            node_env: process.env.NODE_ENV ?? "unknown",
            vercel: Boolean(process.env.VERCEL),
            vercel_env: process.env.VERCEL_ENV ?? null,
            env_keys: {
              AUTH_SECRET: envPresent("AUTH_SECRET"),
              DB_HOST: envPresent("DB_HOST"),
              DB_USER: envPresent("DB_USER"),
              DB_PASSWORD: envPresent("DB_PASSWORD"),
              DB_NAME: envPresent("DB_NAME"),
              DB_PORT: envPresent("DB_PORT"),
            },
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
