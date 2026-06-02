import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  clearAdminLogs,
  countAdminLogsErrosRecentes,
  countAdminLogsTotal,
  deleteAdminLog,
  listAdminLogs,
  type AdminLogFiltroNivel,
} from "@/lib/admin-logs.server";
import { dbErrorMessage } from "@/lib/agendamento.server";
import {
  getAdminSessionFromRequest,
  isAdminRequest,
  podeGerenciarUsuarios,
} from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";

const NIVEIS: AdminLogFiltroNivel[] = [
  "problemas",
  "error",
  "warning",
  "security",
  "info",
  "todos",
];

function parseNivel(raw: string | null): AdminLogFiltroNivel {
  const v = (raw ?? "problemas").trim().toLowerCase();
  return NIVEIS.includes(v as AdminLogFiltroNivel) ? (v as AdminLogFiltroNivel) : "problemas";
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), id: z.string().min(1) }),
  z.object({
    action: z.literal("clear"),
    nivel: z.enum(["todos", "info", "warning", "error", "security", "problemas"]),
  }),
]);

function exigeAdmin(session: ReturnType<typeof getAdminSessionFromRequest>) {
  return podeGerenciarUsuarios(session);
}

export const Route = createFileRoute("/api/admin/logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!exigeAdmin(session)) {
          return jsonResponse({ ok: false, message: "Acesso apenas para administrador." }, 403);
        }

        const url = new URL(request.url);
        const nivel = parseNivel(url.searchParams.get("nivel"));
        const busca = url.searchParams.get("q")?.trim() ?? "";
        const page = Math.max(1, Number(url.searchParams.get("p") ?? 1) || 1);
        const perPage = Math.min(200, Math.max(1, Number(url.searchParams.get("perPage") ?? 30) || 30));

        try {
          const [{ itens, total }, totalGeral, erros24h] = await Promise.all([
            listAdminLogs({ nivel, busca, page, perPage }),
            countAdminLogsTotal(),
            countAdminLogsErrosRecentes(24),
          ]);
          const totalPaginas = Math.max(1, Math.ceil(total / perPage));

          return jsonResponse({
            ok: true,
            itens,
            total,
            totalGeral,
            erros24h,
            page,
            perPage,
            totalPaginas,
            nivel,
            busca,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!exigeAdmin(session)) {
          return jsonResponse({ ok: false, message: "Acesso apenas para administrador." }, 403);
        }

        const parsed = postSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ ok: false, message: "Dados inválidos." }, 422);

        try {
          if (parsed.data.action === "delete") {
            const ok = await deleteAdminLog(parsed.data.id);
            if (!ok) return jsonResponse({ ok: false, message: "Não foi possível apagar." }, 404);
            return jsonResponse({ ok: true, message: "Registro removido do log." });
          }

          const qtd = await clearAdminLogs(parsed.data.nivel);
          return jsonResponse({
            ok: true,
            message:
              qtd > 0 ? `${qtd} registro(s) removido(s) do log.` : "Nenhum registro para remover.",
            removidos: qtd,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
