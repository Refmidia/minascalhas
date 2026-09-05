import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getPrisma } from "@/lib/db.server";
import { dbFotoId, fotoPublicUrl } from "@/lib/produto-foto-url";
import { produtosUploadDir } from "@/lib/produtos-upload.server";
import { isBlobPrivateRef, isVercelBlobUrl, resolveBlobStoredUrl } from "@/lib/usuario-thumb-url";

let fotoColsOk = false;

function intId(v: number): number {
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

export async function ensureProdutoFotoDataColumns(
  prisma?: Awaited<ReturnType<typeof getPrisma>>,
): Promise<void> {
  if (fotoColsOk) return;
  const db = prisma ?? (await getPrisma());
  try {
    await db.$executeRawUnsafe(`ALTER TABLE produto_fotos ADD COLUMN arquivo_mime VARCHAR(64) NULL`);
  } catch {
    /* coluna já existe */
  }
  try {
    await db.$executeRawUnsafe(`ALTER TABLE produto_fotos ADD COLUMN arquivo_data MEDIUMTEXT NULL`);
  } catch {
    /* coluna já existe */
  }
  fotoColsOk = true;
}

export async function getProdutoFotoBytes(
  fotoId: number,
): Promise<{ mime: string; data: Buffer } | null> {
  const prisma = await getPrisma();
  await ensureProdutoFotoDataColumns(prisma);
  const rows = await prisma.$queryRawUnsafe<
    { arquivo_mime: string | null; arquivo_data: string | null }[]
  >(
    `SELECT arquivo_mime, arquivo_data FROM produto_fotos WHERE id = ? LIMIT 1`,
    intId(fotoId),
  );
  const row = rows[0];
  if (!row?.arquivo_data || !row.arquivo_mime) return null;
  return { mime: row.arquivo_mime, data: Buffer.from(row.arquivo_data, "base64") };
}

export async function salvarProdutoFotoBytes(
  fotoId: number,
  mime: string,
  base64: string,
): Promise<void> {
  const prisma = await getPrisma();
  await ensureProdutoFotoDataColumns(prisma);
  const id = intId(fotoId);
  await prisma.$executeRawUnsafe(
    `UPDATE produto_fotos SET arquivo_mime = ?, arquivo_data = ?, arquivo = ? WHERE id = ?`,
    mime,
    base64,
    `db:${id}`,
    id,
  );
}

function mimeDoNome(nome: string): string {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function bytesDeArquivoLocal(arquivo: string): { mime: string; base64: string } | null {
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? "";
  if (!name || name.includes("..")) return null;
  const candidatos = [
    path.join(produtosUploadDir(), name),
    path.join(process.cwd(), "public", "images", "produtos", name),
  ];
  const file = candidatos.find((p) => existsSync(p));
  if (!file) return null;
  return { mime: mimeDoNome(name), base64: readFileSync(file).toString("base64") };
}

async function bytesDeUrl(url: string): Promise<{ mime: string; base64: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32) return null;
    return { mime, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

/** Traz foto antiga (Blob/disco) para o MySQL quando o arquivo ainda dá para ler. */
export async function importarProdutoFotoParaMysql(fotoId: number, arquivo: string): Promise<boolean> {
  const id = intId(fotoId);
  if (id <= 0) return false;
  if (dbFotoId(arquivo)) {
    const ja = await getProdutoFotoBytes(id);
    return Boolean(ja);
  }

  const atual = await getProdutoFotoBytes(id);
  if (atual) {
    await salvarProdutoFotoBytes(id, atual.mime, atual.data.toString("base64"));
    return true;
  }

  const local = bytesDeArquivoLocal(arquivo);
  if (local) {
    await salvarProdutoFotoBytes(id, local.mime, local.base64);
    return true;
  }

  const raw = resolveBlobStoredUrl(arquivo).trim();
  if (isFotoHttp(raw) || isBlobPrivateRef(arquivo) || isVercelBlobUrl(raw)) {
    const remoto = await bytesDeUrl(raw);
    if (remoto) {
      await salvarProdutoFotoBytes(id, remoto.mime, remoto.base64);
      return true;
    }
  }

  return false;
}

function isFotoHttp(arquivo: string): boolean {
  return /^https?:\/\//i.test(arquivo.trim());
}

export async function resolverUrlProdutoFoto(fotoId: number, arquivo: string): Promise<string> {
  const ok = await importarProdutoFotoParaMysql(fotoId, arquivo);
  return fotoPublicUrl(ok ? `db:${fotoId}` : arquivo);
}

export async function importarFotosProdutoParaMysql(produtoId: number): Promise<void> {
  const prisma = await getPrisma();
  await ensureProdutoFotoDataColumns(prisma);
  const rows = await prisma.$queryRawUnsafe<{ id: unknown; arquivo: string }[]>(
    `SELECT id, arquivo FROM produto_fotos WHERE produto_id = ?`,
    intId(produtoId),
  );
  for (const row of rows) {
    const id = intId(Number(row.id));
    if (id <= 0) continue;
    try {
      await importarProdutoFotoParaMysql(id, row.arquivo ?? "");
    } catch {
      /* segue as outras */
    }
  }
}
