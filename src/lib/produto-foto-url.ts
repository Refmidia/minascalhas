import { blobUrlParaExibicao, isBlobPrivateRef } from "@/lib/usuario-thumb-url";

export function dbFotoId(stored: string): number | null {
  const m = /^db:(\d+)$/.exec(stored.trim());
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function dbFotoImageUrl(fotoId: number, cacheBust?: number | string): string {
  const base = `/api/media/produto-foto/${fotoId}`;
  if (cacheBust == null) return base;
  return `${base}?v=${encodeURIComponent(String(cacheBust))}`;
}

export function isFotoStoredUrl(arquivo: string): boolean {
  return /^https?:\/\//i.test(arquivo.trim());
}

export function fotoPublicUrl(arquivo: string): string {
  const dbId = dbFotoId(arquivo);
  if (dbId) return dbFotoImageUrl(dbId);
  if (isBlobPrivateRef(arquivo) || isFotoStoredUrl(arquivo)) {
    return blobUrlParaExibicao(arquivo);
  }
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/produtos/${encodeURIComponent(name)}`;
}
