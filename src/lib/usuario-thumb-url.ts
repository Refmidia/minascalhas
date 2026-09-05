/** Helpers de URL de avatar (client + server). */

export const BLOB_PRIVATE_PREFIX = "blobprivate:";
/** Foto salva em usuarios.thumb_data (MySQL). */
export const DB_THUMB_PREFIX = "db:";

export function isDbThumbRef(stored: string): boolean {
  return /^db:\d+$/.test(stored.trim());
}

export function dbThumbUserId(stored: string): number | null {
  const m = /^db:(\d+)$/.exec(stored.trim());
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function dbThumbImageUrl(userId: number, cacheBust?: number | string): string {
  const base = `/api/admin/usuarios/${userId}/thumb`;
  if (cacheBust == null) return base;
  return `${base}?v=${encodeURIComponent(String(cacheBust))}`;
}

export function isBlobPrivateRef(stored: string): boolean {
  return stored.startsWith(BLOB_PRIVATE_PREFIX);
}

export function isVercelBlobUrl(stored: string): boolean {
  const raw = resolveBlobStoredUrl(stored).trim();
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host.includes("blob.vercel-storage.com") || host.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function resolveBlobStoredUrl(stored: string): string {
  if (isBlobPrivateRef(stored)) return stored.slice(BLOB_PRIVATE_PREFIX.length);
  return stored;
}

export function blobUrlParaExibicao(stored: string): string {
  const raw = resolveBlobStoredUrl(stored).trim();
  if (isBlobPrivateRef(stored) || isVercelBlobUrl(raw)) {
    return `/api/media/blob?url=${encodeURIComponent(raw)}`;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  return stored;
}
