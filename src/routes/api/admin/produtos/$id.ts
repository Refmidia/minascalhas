import { createFileRoute } from "@tanstack/react-router";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import { produtosUploadDir } from "@/lib/produtos-upload.server";
import { resolveProdutoImagemUrl } from "@/lib/produtos-site.server";

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "produto";
}

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const putSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean(),
});

export const Route = createFileRoute("/api/admin/produtos/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        try {
          const prisma = await getPrisma();
          const row = await prisma.produtoSite.findUnique({
            where: { id },
            include: { _count: { select: { fotos: true } } },
          });
          if (!row) return jsonResponse({ ok: false, message: "Produto não encontrado." }, 404);
          return jsonResponse({
            ok: true,
            item: {
              id: row.id,
              nome: row.nome,
              slug: row.slug,
              descricao: row.descricao,
              ativo: row.ativo === 1,
              total_fotos: row._count.fotos,
              imagem_url: await resolveProdutoImagemUrl(prisma, row.id, row.slug),
            },
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      PUT: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        const parsed = putSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ ok: false, message: "Dados inválidos." }, 422);

        try {
          const prisma = await getPrisma();
          const atual = await prisma.produtoSite.findUnique({ where: { id } });
          if (!atual) return jsonResponse({ ok: false, message: "Produto não encontrado." }, 404);

          let slug = slugify(parsed.data.nome);
          const dup = await prisma.produtoSite.findFirst({
            where: { slug, NOT: { id } },
          });
          if (dup) slug = `${slug}-${id}`;

          await prisma.produtoSite.update({
            where: { id },
            data: {
              nome: parsed.data.nome,
              slug,
              descricao: parsed.data.descricao?.trim() || null,
              ativo: parsed.data.ativo ? 1 : 0,
            },
          });
          return jsonResponse({ ok: true, message: "Produto atualizado." });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      DELETE: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        try {
          const prisma = await getPrisma();
          const produto = await prisma.produtoSite.findUnique({
            where: { id },
            include: { fotos: true },
          });
          if (!produto) return jsonResponse({ ok: false, message: "Produto não encontrado." }, 404);

          const dir = produtosUploadDir();
          for (const f of produto.fotos) {
            const arquivo = f.arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? f.arquivo;
            try {
              await unlink(path.join(dir, arquivo));
            } catch {
              /* arquivo pode não existir */
            }
          }

          await prisma.produtoSite.delete({ where: { id } });
          return jsonResponse({ ok: true, message: "Produto excluído." });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
