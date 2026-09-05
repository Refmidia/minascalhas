import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { createFileRoute } from "@tanstack/react-router";

import { resolveBlobReadWriteToken } from "@/lib/blob-upload.server";
import { produtosUploadDir } from "@/lib/produtos-upload.server";
import { resolveUploadDir } from "@/lib/upload-dir.server";

function urlBlobPermitida(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function pathnameDoBlob(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, "");
  } catch {
    return "";
  }
}

function servirArquivoLocal(pathname: string): Response | null {
  const nome = pathname.split(/[/\\]/).pop() ?? "";
  if (!nome || nome.includes("..")) return null;
  const candidatos = [
    path.join(produtosUploadDir(), nome),
    path.join(resolveUploadDir("USER_THUMB_DIR", ["images", "thumb"]), nome),
    path.join(process.cwd(), "public", "images", "produtos", nome),
    path.join(process.cwd(), "public", "images", "thumb", nome),
  ];
  const arquivo = candidatos.find((p) => existsSync(p));
  if (!arquivo) return null;
  const ext = nome.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
  return new Response(Readable.toWeb(createReadStream(arquivo)) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function tentarGet(
  alvo: string,
  access: "private" | "public",
  token?: string,
): Promise<Response | null> {
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(alvo, {
      access,
      ...(token ? { token } : {}),
    });
    if (!result?.stream) return null;
    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.blob.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return null;
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

        const pathname = pathnameDoBlob(decoded);
        const local = pathname ? servirArquivoLocal(pathname) : null;
        if (local) return local;

        try {
          const direto = await fetch(decoded, { redirect: "follow" });
          if (direto.ok && direto.body) {
            return new Response(direto.body, {
              status: 200,
              headers: {
                "Content-Type": direto.headers.get("content-type") || "image/jpeg",
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
        } catch {
          /* store privado — tenta o SDK */
        }

        const token = resolveBlobReadWriteToken();
        const alvos = [decoded, pathname].filter(Boolean);
        for (const alvo of alvos) {
          for (const access of ["private", "public"] as const) {
            const ok = await tentarGet(alvo, access, token);
            if (ok) return ok;
          }
        }

        return new Response("Não encontrado", { status: 404 });
      },
    },
  },
});
