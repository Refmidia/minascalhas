import { createFileRoute } from "@tanstack/react-router";

import {
  adminSessionCookieHeader,
  buildAdminSessionPayload,
  createAdminSessionToken,
  redirectAposLogin,
  sessionToPublic,
} from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { dbErrorMessage } from "@/lib/agendamento.server";
import { jsonResponse } from "@/lib/http.server";

/** Só no PC (npm run dev): nunca em produção, Vercel ou acesso fora do localhost. */
function devLoginPermitido(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL) return false;
  const host = new URL(request.url).hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export const Route = createFileRoute("/api/admin/dev-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!devLoginPermitido(request)) {
          return jsonResponse({ ok: false, message: "Indisponível." }, 404);
        }

        try {
          const prisma = await getPrisma();
          const rows = await prisma.$queryRawUnsafe<
            { id: unknown; nome: string; usuario: string; email: string; nivel: string; thumb: string | null }[]
          >(
            `SELECT id, nome, usuario, email, nivel, thumb FROM usuarios
             WHERE LOWER(TRIM(nivel)) = 'admin'
             ORDER BY id ASC LIMIT 1`,
          );
          const row = rows[0];
          if (!row) return jsonResponse({ ok: false, message: "Nenhum administrador cadastrado." }, 404);

          const payload = await buildAdminSessionPayload({
            id: Number(row.id),
            nome: row.nome,
            usuario: row.usuario,
            email: row.email ?? "",
            nivel: row.nivel,
            thumb: row.thumb?.trim() || "nao.png",
          });
          const token = createAdminSessionToken(payload);
          if (!token) {
            return jsonResponse({ ok: false, message: "AUTH_SECRET ausente no .env." }, 503);
          }

          return jsonResponse(
            {
              ok: true,
              user: sessionToPublic({ ...payload, exp: Date.now() + 1 }),
              redirect: redirectAposLogin(payload),
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
