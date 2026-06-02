/** Upload via Vercel Blob (produção serverless). */

import { BLOB_PRIVATE_PREFIX } from "@/lib/usuario-thumb-url";

export { isBlobPrivateRef, resolveBlobStoredUrl, blobUrlParaExibicao } from "@/lib/usuario-thumb-url";

export function resolveBlobReadWriteToken(): string | undefined {
  const direto = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (direto) return direto;

  for (const [key, val] of Object.entries(process.env)) {
    if (!val?.trim()) continue;
    if (/BLOB.*READ.*WRITE.*TOKEN/i.test(key) || key === "READ_WRITE_TOKEN") {
      return val.trim();
    }
  }
  return undefined;
}

export function hasBlobStorage(): boolean {
  return Boolean(resolveBlobReadWriteToken());
}

function blobAccessPreferido(): "public" | "private" {
  const env = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (env === "private") return "private";
  if (env === "public") return "public";
  return "public";
}

export async function uploadBlob(
  key: string,
  file: File,
): Promise<{ stored: string } | { erro: string }> {
  const token = resolveBlobReadWriteToken();
  if (!token) {
    return {
      erro:
        "Blob não configurado: na Vercel, Storage → Blob → Connect Project com read-write token e Redeploy.",
    };
  }

  const { put } = await import("@vercel/blob");
  let access = blobAccessPreferido();

  async function doPut(mode: "public" | "private") {
    return put(key, file, { access: mode, token });
  }

  try {
    let blob;
    try {
      blob = await doPut(access);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (access === "public" && /private store/i.test(msg)) {
        access = "private";
        blob = await doPut("private");
      } else {
        throw e;
      }
    }

    if (access === "private") {
      return { stored: `${BLOB_PRIVATE_PREFIX}${blob.url}` };
    }
    return { stored: blob.url };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { erro: `Falha ao enviar para o Blob: ${detail}` };
  }
}
