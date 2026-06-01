import { createFileRoute } from "@tanstack/react-router";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import { produtosUploadDir } from "@/lib/produtos-upload.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const patchSchema = z.object({
  legenda: z.string().max(255).optional(),
  capa: z.literal(true).optional(),
});

export const Route = createFileRoute("/api/admin/produtos/$id/fotos/$fotoId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const produtoId = lerId(params.id);
        const fotoId = lerId(params.fotoId);
        if (!produtoId || !fotoId) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        const parsed = patchSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ ok: false, message: "Dados inválidos." }, 422);

        try {
          const prisma = await getPrisma();
          const foto = await prisma.produtoFoto.findFirst({
            where: { id: fotoId, produtoId },
          });
          if (!foto) return jsonResponse({ ok: false, message: "Foto não encontrada." }, 404);

          if (parsed.data.capa) {
            await prisma.produtoFoto.updateMany({
              where: { produtoId },
              data: { ehCapa: 0 },
            });
            await prisma.produtoFoto.update({
              where: { id: fotoId },
              data: { ehCapa: 1 },
            });
            return jsonResponse({ ok: true, message: "Capa definida." });
          }

          if (parsed.data.legenda !== undefined) {
            await prisma.produtoFoto.update({
              where: { id: fotoId },
              data: { legenda: parsed.data.legenda.trim() || null },
            });
            return jsonResponse({ ok: true, message: "Legenda atualizada." });
          }

          return jsonResponse({ ok: false, message: "Nada para atualizar." }, 422);
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      DELETE: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const produtoId = lerId(params.id);
        const fotoId = lerId(params.fotoId);
        if (!produtoId || !fotoId) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        try {
          const prisma = await getPrisma();
          const foto = await prisma.produtoFoto.findFirst({
            where: { id: fotoId, produtoId },
          });
          if (!foto) return jsonResponse({ ok: false, message: "Foto não encontrada." }, 404);

          const eraCapa = foto.ehCapa === 1;
          const arquivo = foto.arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? foto.arquivo;
          try {
            await unlink(path.join(produtosUploadDir(), arquivo));
          } catch {
            /* ignore */
          }

          await prisma.produtoFoto.delete({ where: { id: fotoId } });

          if (eraCapa) {
            const proxima = await prisma.produtoFoto.findFirst({
              where: { produtoId },
              orderBy: [{ ordem: "asc" }, { id: "asc" }],
            });
            if (proxima) {
              await prisma.produtoFoto.update({
                where: { id: proxima.id },
                data: { ehCapa: 1 },
              });
            }
          }

          return jsonResponse({ ok: true, message: "Foto removida." });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
