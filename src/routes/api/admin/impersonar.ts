import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import {
  adminSessionCookieHeader,
  encerrarImpersonacao,
  getAdminSessionFromRequest,
  iniciarImpersonacao,
  isAdminRequest,
  parseAdminSessionToken,
  sessionToPublic,
} from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";

const bodySchema = z.object({
  targetId: z.number().int().positive().optional(),
  sair: z.boolean().optional(),
});

export const Route = createFileRoute("/api/admin/impersonar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session) return jsonResponse({ ok: false, message: "Não autorizado." }, 401);

        const url = new URL(request.url);
        const sairQuery = url.searchParams.get("sair") === "1";

        let body: z.infer<typeof bodySchema> = {};
        try {
          const raw = await request.json().catch(() => ({}));
          const parsed = bodySchema.safeParse(raw);
          if (parsed.success) body = parsed.data;
        } catch {
          /* body opcional */
        }

        const sair = sairQuery || body.sair === true;

        try {
          const res = sair
            ? await encerrarImpersonacao(session)
            : await iniciarImpersonacao(session, body.targetId ?? 0);

          if (!res.ok || !res.token) {
            return jsonResponse({ ok: false, message: res.message ?? "Não permitido." }, 403);
          }

          const parsed = parseAdminSessionToken(res.token);
          const user = parsed ? sessionToPublic({ ...parsed, exp: Date.now() + 1 }) : null;

          return jsonResponse(
            { ok: true, redirect: res.redirect, user },
            200,
            Object.fromEntries([adminSessionCookieHeader(res.token)]),
          );
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
