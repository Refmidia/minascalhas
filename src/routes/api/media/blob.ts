import { createFileRoute } from "@tanstack/react-router";

function urlBlobPermitida(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/media/blob")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const decoded = decodeURIComponent(
          new URL(request.url).searchParams.get("url") ?? "",
        ).trim();

        if (!decoded || !urlBlobPermitida(decoded)) {
          return new Response("Não encontrado", { status: 404 });
        }

        try {
          const { get } = await import("@vercel/blob");
          const result = await get(decoded, { access: "private" });
          if (!result || result.statusCode !== 200 || !result.stream) {
            return new Response("Não encontrado", { status: 404 });
          }

          return new Response(result.stream, {
            status: 200,
            headers: {
              "Content-Type": result.blob.contentType || "image/jpeg",
              "Cache-Control": "private, max-age=86400",
            },
          });
        } catch {
          return new Response("Erro ao carregar imagem", { status: 502 });
        }
      },
    },
  },
});
