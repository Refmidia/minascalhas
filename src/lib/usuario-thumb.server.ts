import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import {
  blobUrlParaExibicao,
  dbThumbImageUrl,
  dbThumbUserId,
  isBlobPrivateRef,
  resolveBlobStoredUrl,
} from "@/lib/usuario-thumb-url";
import {
  extensaoFromNomeArquivo,
  extensaoSegura,
  FOTOS_MAX_BYTES,
  resolverMimeImagem,
} from "@/lib/produtos-upload.server";
import {
  canPersistUploadsOnDisk,
  resolveUploadDir,
} from "@/lib/upload-dir.server";
import { getPrisma } from "@/lib/db.server";

let thumbDataColsOk = false;

async function ensureThumbDataColumns(prisma: Awaited<ReturnType<typeof getPrisma>>) {
  if (thumbDataColsOk) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE usuarios ADD COLUMN thumb_mime VARCHAR(64) NULL`);
  } catch {
    /* coluna já existe */
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE usuarios ADD COLUMN thumb_data MEDIUMTEXT NULL`);
  } catch {
    /* coluna já existe */
  }
  thumbDataColsOk = true;
}

async function setUsuarioThumbData(id: number, mime: string, base64: string): Promise<void> {
  const prisma = await getPrisma();
  await ensureThumbDataColumns(prisma);
  const mimeEsc = mime.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const dataEsc = base64.replace(/\\/g, "\\\\").replace(/'/g, "''");
  await prisma.$executeRawUnsafe(
    `UPDATE usuarios SET thumb_mime = '${mimeEsc}', thumb_data = '${dataEsc}' WHERE id = ${int(id)}`,
  );
}

function int(v: number): number {
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

async function clearUsuarioThumbData(id: number): Promise<void> {
  const prisma = await getPrisma();
  await ensureThumbDataColumns(prisma);
  await prisma.$executeRawUnsafe(
    `UPDATE usuarios SET thumb_mime = NULL, thumb_data = NULL WHERE id = ${int(id)}`,
  );
}

/** data:image/...;base64,... — funciona direto no <img>, sem segunda requisição. */
export async function thumbDataUrlDoUsuario(id: number): Promise<string | null> {
  const prisma = await getPrisma();
  await ensureThumbDataColumns(prisma);
  const rows = await prisma.$queryRawUnsafe<{ thumb_mime: string | null; thumb_data: string | null }[]>(
    `SELECT thumb_mime, thumb_data FROM usuarios WHERE id = ${int(id)} LIMIT 1`,
  );
  const row = rows[0];
  if (!row?.thumb_data || !row.thumb_mime) return null;
  return `data:${row.thumb_mime};base64,${row.thumb_data}`;
}

export async function resolverThumbUrlExibicao(thumb: string): Promise<string | null> {
  if (!thumb || thumb === "nao.png") return null;
  const dbId = dbThumbUserId(thumb);
  if (dbId) return thumbDataUrlDoUsuario(dbId);
  return thumbPublicUrl(thumb);
}

/** Corrige thumb=db:ID sem imagem no banco (estado quebrado de upload antigo). */
export async function repararThumbOrfao(usuarioId: number, thumb: string): Promise<string> {
  const dbId = dbThumbUserId(thumb);
  if (!dbId || dbId !== usuarioId) return thumb;
  const dataUrl = await thumbDataUrlDoUsuario(usuarioId);
  if (dataUrl) return thumb;
  const prisma = await getPrisma();
  await prisma.$executeRawUnsafe(`UPDATE usuarios SET thumb = 'nao.png' WHERE id = ${int(usuarioId)}`);
  await clearUsuarioThumbData(usuarioId);
  return "nao.png";
}

export type ThumbEnriquecido = { thumb: string; thumb_url: string | null };

export async function enriquecerThumbUsuario(
  usuarioId: number,
  thumb: string,
): Promise<ThumbEnriquecido> {
  const repaired = await repararThumbOrfao(usuarioId, thumb?.trim() || "nao.png");
  return {
    thumb: repaired,
    thumb_url: repaired !== "nao.png" ? await resolverThumbUrlExibicao(repaired) : null,
  };
}

export async function mapaThumbsEnriquecidos(
  items: Array<{ id: number; thumb: string }>,
): Promise<Map<number, ThumbEnriquecido>> {
  const uniq = [...new Map(items.map((item) => [item.id, item])).values()];
  const entries = await Promise.all(
    uniq.map(async (item) => [item.id, await enriquecerThumbUsuario(item.id, item.thumb)] as const),
  );
  return new Map(entries);
}

export async function getUsuarioThumbData(
  id: number,
): Promise<{ mime: string; data: Buffer } | null> {
  const prisma = await getPrisma();
  await ensureThumbDataColumns(prisma);
  const rows = await prisma.$queryRawUnsafe<{ thumb_mime: string | null; thumb_data: string | null }[]>(
    `SELECT thumb_mime, thumb_data FROM usuarios WHERE id = ${int(id)} LIMIT 1`,
  );
  const row = rows[0];
  if (!row?.thumb_data || !row.thumb_mime) return null;
  return {
    mime: row.thumb_mime,
    data: Buffer.from(row.thumb_data, "base64"),
  };
}

export function usuarioThumbUploadDir(): string {
  return resolveUploadDir("USER_THUMB_DIR", ["images", "thumb"]);
}

export function isThumbStoredUrl(thumb: string): boolean {
  return /^https?:\/\//i.test(thumb.trim());
}

export function thumbPublicUrl(arquivo: string): string {
  const dbId = dbThumbUserId(arquivo);
  if (dbId) return dbThumbImageUrl(dbId);
  if (isBlobPrivateRef(arquivo) || isThumbStoredUrl(arquivo)) {
    return blobUrlParaExibicao(arquivo);
  }
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/thumb/${encodeURIComponent(name)}`;
}

export function thumbNomeSeguro(nome: string): string | null {
  const base = path.basename(nome.trim());
  if (!base || base !== nome.trim() || base.includes("..")) return null;
  return base;
}

/** Salva a foto no MySQL (thumb_data) — funciona na Vercel sem Blob. */
export async function salvarThumbUpload(
  userId: number,
  file: File,
): Promise<{ arquivo: string } | { erro: string }> {
  const mime = resolverMimeImagem(file);
  if (!mime) {
    return {
      erro: "Tipo de arquivo não permitido. Use JPG, JPEG, PNG, WebP, GIF ou outra imagem comum.",
    };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 8 MB." };
  }
  const ext = extensaoSegura(mime) ?? extensaoFromNomeArquivo(file.name) ?? "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  try {
    await setUsuarioThumbData(userId, mime, base64);
    return { arquivo: `db:${userId}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erro: `Não foi possível salvar a foto no banco: ${msg}` };
  }
}

/** Legado: grava em public/images/thumb (só ambiente local com disco). */
export async function salvarThumbUploadDisco(
  file: File,
): Promise<{ arquivo: string } | { erro: string }> {
  const mime = resolverMimeImagem(file);
  if (!mime) {
    return {
      erro: "Tipo de arquivo não permitido. Use JPG, JPEG, PNG, WebP, GIF ou outra imagem comum.",
    };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 8 MB." };
  }
  const ext = extensaoSegura(mime) ?? extensaoFromNomeArquivo(file.name) ?? "jpg";
  if (!canPersistUploadsOnDisk("USER_THUMB_DIR")) {
    return { erro: "Upload em disco indisponível neste ambiente." };
  }

  const dir = usuarioThumbUploadDir();
  await mkdir(dir, { recursive: true });
  const arquivo = `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, arquivo), buf);
  return { arquivo };
}

export async function removerThumbArquivo(thumb: string): Promise<void> {
  if (!thumb || thumb === "nao.png") return;

  const dbId = dbThumbUserId(thumb);
  if (dbId) {
    await clearUsuarioThumbData(dbId);
    return;
  }

  if (isThumbStoredUrl(thumb) || isBlobPrivateRef(thumb)) {
    try {
      const { del } = await import("@vercel/blob");
      await del(resolveBlobStoredUrl(thumb));
    } catch {
      /* ignore */
    }
    return;
  }

  const nome = thumbNomeSeguro(thumb);
  if (!nome) return;
  const filePath = path.join(usuarioThumbUploadDir(), nome);
  try {
    await unlink(filePath);
  } catch {
    /* arquivo pode estar só no servidor Alex */
  }
}
