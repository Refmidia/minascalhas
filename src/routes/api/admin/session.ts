import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import {
  adminSessionCookieHeader,
  buildAdminSessionPayload,
  createAdminSessionToken,
  estaImpersonando,
  getAdminSessionFromRequest,
  sessionToPublic,
} from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = getAdminSessionFromRequest(request);
        if (!session) {
          return jsonResponse({ ok: true, authenticated: false, user: null });
        }

        try {
          const prisma = await getPrisma();
          const row = await prisma.usuario.findUnique({ where: { id: session.userId } });
          if (!row) {
            return jsonResponse({ ok: true, authenticated: false, user: null });
          }

          let payload: Awaited<ReturnType<typeof buildAdminSessionPayload>>;

          if (estaImpersonando(session) && session.impersonation) {
            const adminRow = await prisma.usuario.findUnique({
              where: { id: session.impersonation.userId },
            });
            payload = {
              userId: row.id,
              nome: row.nome,
              usuario: row.usuario,
              thumb: row.thumb?.trim() || "nao.png",
              nivelReal: adminRow?.nivel ?? session.nivelReal,
              visao: session.visao,
              podeSimular: session.podeSimular,
              fornecedorPreviewId: session.fornecedorPreviewId,
              impersonation: {
                ...session.impersonation,
                nome: adminRow?.nome ?? session.impersonation.nome,
                usuario: adminRow?.usuario ?? session.impersonation.usuario,
              },
            };
          } else {
            payload = await buildAdminSessionPayload(
              {
                id: row.id,
                nome: row.nome,
                usuario: row.usuario,
                email: row.email,
                nivel: row.nivel,
                thumb: row.thumb?.trim() || "nao.png",
              },
              session.podeSimular ? session.visao : undefined,
            );
          }
          const token = createAdminSessionToken(payload);
          const headers: Record<string, string> = token
            ? Object.fromEntries([adminSessionCookieHeader(token)])
            : {};

          return jsonResponse(
            {
              ok: true,
              authenticated: true,
              user: sessionToPublic({ ...payload, exp: Date.now() + 1 }),
            },
            200,
            headers,
          );
        } catch (err) {
          return jsonResponse(
            {
              ok: true,
              authenticated: true,
              user: sessionToPublic(session),
              message: dbErrorMessage(err),
            },
            200,
          );
        }
      },
    },
  },
});
