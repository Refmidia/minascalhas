/** Helpers de URL de avatar (client + server). */

export const BLOB_PRIVATE_PREFIX = "blobprivate:";

export function isBlobPrivateRef(stored: string): boolean {
  return stored.startsWith(BLOB_PRIVATE_PREFIX);
}

export function resolveBlobStoredUrl(stored: string): string {
  if (isBlobPrivateRef(stored)) return stored.slice(BLOB_PRIVATE_PREFIX.length);
  return stored;
}

export function blobUrlParaExibicao(stored: string): string {
  if (isBlobPrivateRef(stored)) {
    const raw = resolveBlobStoredUrl(stored);
    return `/api/media/blob?url=${encodeURIComponent(raw)}`;
  }
  if (/^https?:\/\//i.test(stored.trim())) return stored.trim();
  return stored;
}
