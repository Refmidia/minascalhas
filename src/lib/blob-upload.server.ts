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

/** Blob ligado via OIDC (padrão Vercel: BLOB_STORE_ID + token OIDC no deploy). */
export function hasBlobOidcOnVercel(): boolean {
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (!storeId) return false;
  return Boolean(
    process.env.VERCEL === "1" ||
      process.env.VERCEL === "true" ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

export function hasBlobStorage(): boolean {
  return Boolean(resolveBlobReadWriteToken()) || hasBlobOidcOnVercel();
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
  const oidc = hasBlobOidcOnVercel();
  if (!token && !oidc) {
    return {
      erro:
        "Blob não configurado: na Vercel, Storage → Blob → Connect Project ao site e Redeploy.",
    };
  }

  const { put } = await import("@vercel/blob");
  let access = blobAccessPreferido();

  async function doPut(mode: "public" | "private") {
    // OIDC (BLOB_STORE_ID): SDK autentica no deploy sem BLOB_READ_WRITE_TOKEN.
    if (token) return put(key, file, { access: mode, token });
    return put(key, file, { access: mode });
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
