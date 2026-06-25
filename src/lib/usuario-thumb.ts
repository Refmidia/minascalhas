/** URLs de avatar — local (`public/images/thumb`) e opcionalmente remoto (Alex). */

import { blobUrlParaExibicao, dbThumbImageUrl, dbThumbUserId, isBlobPrivateRef } from "@/lib/usuario-thumb-url";

export function usuarioTemFoto(thumb: string | null | undefined): boolean {
  return Boolean(thumb && thumb.trim() && thumb !== "nao.png");
}

export function usuarioThumbLocalUrl(thumb: string, cacheBust?: number | string): string | null {
  if (!thumb || thumb === "nao.png") return null;
  const dbId = dbThumbUserId(thumb);
  if (dbId) return dbThumbImageUrl(dbId, cacheBust);
  if (isBlobPrivateRef(thumb)) return blobUrlParaExibicao(thumb);
  if (/^https?:\/\//i.test(thumb.trim())) return thumb.trim();
  const name = thumb.replace(/^\/+/, "").split(/[/\\]/).pop() ?? thumb;
  return `/images/thumb/${encodeURIComponent(name)}`;
}

export function usuarioThumbRemoteUrl(thumb: string): string | null {
  try {
    const base = import.meta.env?.VITE_USER_THUMB_BASE;
    if (typeof base !== "string" || !base.trim()) return null;
    if (!thumb || thumb === "nao.png") return null;
    const name = thumb.replace(/^\/+/, "").split(/[/\\]/).pop() ?? thumb;
    return `${base.replace(/\/$/, "")}/${encodeURIComponent(name)}`;
  } catch {
    return null;
  }
}
