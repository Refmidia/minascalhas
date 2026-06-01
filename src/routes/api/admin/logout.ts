import { createFileRoute } from "@tanstack/react-router";

import { clearAdminSessionCookieHeader } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async () =>
        jsonResponse({ ok: true }, 200, Object.fromEntries([clearAdminSessionCookieHeader()])),
    },
  },
});
