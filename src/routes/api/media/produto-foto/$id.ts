import { createFileRoute } from "@tanstack/react-router";

import { getProdutoFotoBytes } from "@/lib/produto-foto-db.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const Route = createFileRoute("/api/media/produto-foto/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = lerId(params.id);
        if (!id) return new Response("Não encontrado", { status: 404 });
        try {
          const payload = await getProdutoFotoBytes(id);
          if (!payload) return new Response("Não encontrado", { status: 404 });
          return new Response(new Uint8Array(payload.data), {
            status: 200,
            headers: {
              "Content-Type": payload.mime,
              "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
              "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
            },
          });
        } catch {
          return new Response("Erro ao carregar imagem", { status: 503 });
        }
      },
    },
  },
});
