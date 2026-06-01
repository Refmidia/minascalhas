import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { isAdminRequest } from "@/lib/auth.server";
import { dbErrorMessage } from "@/lib/agendamento.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
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

const postSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  descricao: z.string().max(500).optional(),
  ativo: z.boolean().optional(),
});

export const Route = createFileRoute("/api/admin/produtos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        try {
          const prisma = await getPrisma();
          const rows = await prisma.produtoSite.findMany({
            orderBy: [{ ordem: "asc" }, { nome: "asc" }],
            include: { _count: { select: { fotos: true } } },
          });
          const itens = await Promise.all(
            rows.map(async (r) => ({
              id: r.id,
              nome: r.nome,
              slug: r.slug,
              descricao: r.descricao,
              ativo: r.ativo === 1,
              ordem: r.ordem,
              total_fotos: r._count.fotos,
              imagem_url: await resolveProdutoImagemUrl(prisma, r.id, r.slug),
            })),
          );
          return jsonResponse({ ok: true, itens });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const parsed = postSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonResponse({ ok: false, message: "Dados inválidos." }, 422);
        try {
          const prisma = await getPrisma();
          const maxOrdem = await prisma.produtoSite.aggregate({ _max: { ordem: true } });
          let slug = slugify(parsed.data.nome);
          const exists = await prisma.produtoSite.findFirst({ where: { slug } });
          if (exists) slug = `${slug}-${Date.now()}`;
          const row = await prisma.produtoSite.create({
            data: {
              nome: parsed.data.nome,
              slug,
              descricao: parsed.data.descricao ?? null,
              ativo: parsed.data.ativo === false ? 0 : 1,
              ordem: (maxOrdem._max.ordem ?? 0) + 1,
            },
          });
          return jsonResponse({ ok: true, item: row });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
