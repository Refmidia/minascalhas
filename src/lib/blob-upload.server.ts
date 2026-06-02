/** Upload via Vercel Blob (produção serverless). */

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

export async function uploadPublicBlob(
  key: string,
  file: File,
): Promise<{ url: string } | { erro: string }> {
  const token = resolveBlobReadWriteToken();
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, file, {
      access: "public",
      token: token || undefined,
    });
    return { url: blob.url };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (!token) {
      return {
        erro:
          "Blob não configurado: na Vercel, Storage → seu Blob → Connect Project, marque " +
          '"read-write token", depois Redeploy. Variável esperada: BLOB_READ_WRITE_TOKEN.',
      };
    }
    return { erro: `Falha ao enviar para o Blob: ${detail}` };
  }
}
