import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dataInputParaDb, dbErrorMessage, serializeInventario } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";

const bodySchema = z.object({
  dataMontagem: z.string().trim().min(1),
});

export const Route = createFileRoute("/api/agendamentos/$id/confirmar-montagem")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!isAdminRequest(request)) {
          return jsonResponse({ ok: false, message: "Não autorizado." }, 401);
        }

        const id = Number(params.id);
        if (!Number.isFinite(id) || id < 1) {
          return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inválido." }, 400);
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "Informe a data de montagem." }, 422);
        }

        try {
          const prisma = await getPrisma();
          const row = await prisma.inventario.findFirst({
            where: {
              id,
              OR: [{ status: "orcamentado" }, { status: "orçamentado" }],
            },
          });
          if (!row) {
            return jsonResponse({ ok: false, message: "Serviço não encontrado." }, 404);
          }

          const updated = await prisma.inventario.update({
            where: { id },
            data: {
              status: "confirmado",
              dataMontagem: dataInputParaDb(parsed.data.dataMontagem),
            },
          });

          return jsonResponse({
            ok: true,
            message: "Serviço confirmado com sucesso!",
            item: serializeInventario(updated),
          });
        } catch (err) {
          console.error("[POST confirmar-montagem]", err);
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
