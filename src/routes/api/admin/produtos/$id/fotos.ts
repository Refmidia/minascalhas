import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import { fotoPublicUrl, salvarFotoUpload } from "@/lib/produtos-upload.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const Route = createFileRoute("/api/admin/produtos/$id/fotos")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const produtoId = lerId(params.id);
        if (!produtoId) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        try {
          const prisma = await getPrisma();
          const fotos = await prisma.produtoFoto.findMany({
            where: { produtoId },
            orderBy: [{ ehCapa: "desc" }, { ordem: "asc" }, { id: "asc" }],
          });
          return jsonResponse({
            ok: true,
            itens: fotos.map((f) => ({
              id: f.id,
              produto_id: f.produtoId,
              arquivo: f.arquivo,
              legenda: f.legenda,
              eh_capa: f.ehCapa === 1,
              ordem: f.ordem,
              url: fotoPublicUrl(f.arquivo),
            })),
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const produtoId = lerId(params.id);
        if (!produtoId) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonResponse({ ok: false, message: "FormData inválido." }, 400);
        }

        const files = form.getAll("fotos").filter((f): f is File => f instanceof File);
        if (!files.length) {
          return jsonResponse({ ok: false, message: "Envie ao menos uma foto." }, 422);
        }

        const legendaPadrao = String(form.get("legenda") ?? "").trim();

        try {
          const prisma = await getPrisma();
          const produto = await prisma.produtoSite.findUnique({ where: { id: produtoId } });
          if (!produto) return jsonResponse({ ok: false, message: "Produto não encontrado." }, 404);

          const temCapa = await prisma.produtoFoto.findFirst({
            where: { produtoId, ehCapa: 1 },
          });
          const maxOrdem = await prisma.produtoFoto.aggregate({
            where: { produtoId },
            _max: { ordem: true },
          });
          let ordem = (maxOrdem._max.ordem ?? 0) + 1;
          const criadas = [];
          let primeiraCapa = !temCapa;

          for (const file of files) {
            const saved = await salvarFotoUpload(file);
            if ("erro" in saved) {
              return jsonResponse({ ok: false, message: saved.erro }, 422);
            }
            const ehCapa = primeiraCapa ? 1 : 0;
            if (primeiraCapa) primeiraCapa = false;
            const row = await prisma.produtoFoto.create({
              data: {
                produtoId,
                arquivo: saved.arquivo,
                legenda: legendaPadrao || null,
                ehCapa,
                ordem: ordem++,
              },
            });
            criadas.push({
              id: row.id,
              arquivo: row.arquivo,
              url: fotoPublicUrl(row.arquivo),
              eh_capa: row.ehCapa === 1,
            });
          }

          return jsonResponse({ ok: true, itens: criadas });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
