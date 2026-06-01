import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const url = new URL(request.url);
        const nivel = url.searchParams.get("nivel")?.trim();
        const limite = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 80)));
        try {
          const prisma = await getPrisma();
          const rows = await prisma.adminLog.findMany({
            where: nivel ? { nivel } : undefined,
            orderBy: { criadoEm: "desc" },
            take: limite,
          });
          return jsonResponse({
            ok: true,
            itens: rows.map((r) => ({
              id: String(r.id),
              nivel: r.nivel,
              mensagem: r.mensagem,
              como_resolver: r.comoResolver,
              pagina: r.pagina,
              usuario_nome: r.usuarioNome,
              criado_em: r.criadoEm.toISOString(),
            })),
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
