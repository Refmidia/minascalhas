import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest } from "@/lib/auth.server";
import {
  pontoEstadoAtual,
  pontoHistoricoUsuario,
  pontoRegistrar,
} from "@/lib/ponto.server";
import { jsonResponse } from "@/lib/http.server";

const postSchema = z.object({
  tipo: z.enum(["entrada", "almoco", "retorno_almoco", "saida"]),
});

export const Route = createFileRoute("/api/admin/ponto")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session) return jsonResponse({ ok: false }, 401);

        try {
          const estado = await pontoEstadoAtual(session.userId);
          const historico = await pontoHistoricoUsuario(session.userId, 40);
          return jsonResponse({
            ok: true,
            nome: session.nome,
            estado,
            historico,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session) return jsonResponse({ ok: false }, 401);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inválido." }, 400);
        }

        const parsed = postSchema.safeParse(body);
        if (!parsed.success) return jsonResponse({ ok: false, message: "Tipo inválido." }, 400);

        try {
          const res = await pontoRegistrar(session.userId, parsed.data.tipo);
          if (!res.ok) return jsonResponse({ ok: false, message: res.message }, 400);

          const estado = await pontoEstadoAtual(session.userId);
          const historico = await pontoHistoricoUsuario(session.userId, 40);
          return jsonResponse({
            ok: true,
            message: res.message,
            estado,
            historico,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
