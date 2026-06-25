import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dbErrorMessage, serializeInventario } from "@/lib/agendamento.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import { parseOrcamentoJson } from "@/lib/orcamento.server";

const querySchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const Route = createFileRoute("/api/os")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({ id: url.searchParams.get("id") });
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        }

        try {
          const prisma = await getPrisma();
          const row = await prisma.inventario.findUnique({ where: { id: parsed.data.id } });
          if (!row) return jsonResponse({ ok: false, message: "Não encontrado." }, 404);

          const itens = parseOrcamentoJson(row.orcamento);
          return jsonResponse(
            {
              ok: true,
              item: serializeInventario(row),
              itens,
            },
            200,
            { "Cache-Control": "no-store" },
          );
        } catch (err) {
          console.error("[GET /api/os]", err);
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
