import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { isAdminRequest } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { jsonResponse } from "@/lib/http.server";
import {
  ocultarImagemPadraoProduto,
  ocultarImagemPadraoTodos,
} from "@/lib/produto-imagem-padrao.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const Route = createFileRoute("/api/admin/produtos/$id/fotos/padrao")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const produtoId = lerId(params.id);
        if (!produtoId) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        const url = new URL(request.url);
        const removerTodos = url.searchParams.get("todos") === "1";

        try {
          const prisma = await getPrisma();
          const produto = await prisma.produtoSite.findUnique({ where: { id: produtoId } });
          if (!produto) return jsonResponse({ ok: false, message: "Produto não encontrado." }, 404);

          if (removerTodos) {
            await ocultarImagemPadraoTodos(prisma);
            return jsonResponse({
              ok: true,
              message: "Imagens padrão removidas de todos os produtos.",
            });
          }

          await ocultarImagemPadraoProduto(prisma, produtoId);
          return jsonResponse({ ok: true, message: "Imagem padrão removida." });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
