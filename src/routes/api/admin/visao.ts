import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  adminSessionCookieHeader,
  buildAdminSessionPayload,
  createAdminSessionToken,
  getAdminSessionFromRequest,
  sessionToPublic,
} from "@/lib/auth.server";
import { dbErrorMessage } from "@/lib/agendamento.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import { normalizarVisao, redirectAposVisao } from "@/lib/visao.server";

const bodySchema = z.object({
  visao: z.string(),
});

export const Route = createFileRoute("/api/admin/visao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const current = getAdminSessionFromRequest(request);
        if (!current) return jsonResponse({ ok: false, message: "Não autorizado." }, 401);
        if (!current.podeSimular) {
          return jsonResponse({ ok: false, message: "Sem permissão para simular perfis." }, 403);
        }

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ ok: false, message: "Dados inválidos." }, 422);

        const visao = normalizarVisao(parsed.data.visao);
        if (!visao) return jsonResponse({ ok: false, message: "Visão inválida." }, 422);

        try {
          const prisma = await getPrisma();
          const row = await prisma.usuario.findUnique({ where: { id: current.userId } });
          if (!row) return jsonResponse({ ok: false, message: "Usuário não encontrado." }, 404);

          const payload = await buildAdminSessionPayload(
            {
              id: row.id,
              nome: row.nome,
              usuario: row.usuario,
              email: row.email,
              nivel: row.nivel,
              thumb: row.thumb?.trim() || "nao.png",
            },
            visao,
          );
          const token = createAdminSessionToken(payload);
          if (!token) return jsonResponse({ ok: false, message: "Sessão inválida." }, 503);

          return jsonResponse(
            {
              ok: true,
              user: sessionToPublic({ ...payload, exp: Date.now() + 1 }),
              redirect: redirectAposVisao(visao, payload.fornecedorPreviewId),
            },
            200,
            Object.fromEntries([adminSessionCookieHeader(token)]),
          );
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
