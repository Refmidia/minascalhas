import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const FOTOS_TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const FOTOS_MAX_BYTES = 8 * 1024 * 1024;

export function produtosUploadDir(): string {
  const custom = process.env.PRODUTOS_UPLOAD_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "public", "images", "produtos");
}

export function fotoPublicUrl(arquivo: string): string {
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/produtos/${encodeURIComponent(name)}`;
}

export function extensaoSegura(mime: string): string | null {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? null;
}

export async function salvarFotoUpload(file: File): Promise<{ arquivo: string } | { erro: string }> {
  if (!FOTOS_TIPOS.has(file.type)) {
    return { erro: "Tipo de arquivo não permitido." };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 5 MB." };
  }
  const ext = extensaoSegura(file.type);
  if (!ext) return { erro: "Extensão inválida." };

  const dir = produtosUploadDir();
  await mkdir(dir, { recursive: true });
  const arquivo = `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, arquivo), buf);
  return { arquivo };
}
