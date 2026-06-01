import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import {
  extensaoSegura,
  FOTOS_MAX_BYTES,
  FOTOS_TIPOS,
} from "@/lib/produtos-upload.server";

export function usuarioThumbUploadDir(): string {
  const custom = process.env.USER_THUMB_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "public", "images", "thumb");
}

export function thumbPublicUrl(arquivo: string): string {
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/thumb/${encodeURIComponent(name)}`;
}

export function thumbNomeSeguro(nome: string): string | null {
  const base = path.basename(nome.trim());
  if (!base || base !== nome.trim() || base.includes("..")) return null;
  return base;
}

export async function salvarThumbUpload(
  file: File,
): Promise<{ arquivo: string } | { erro: string }> {
  if (!FOTOS_TIPOS.has(file.type)) {
    return { erro: "Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF." };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 8 MB." };
  }
  const ext = extensaoSegura(file.type);
  if (!ext) return { erro: "Extensão inválida." };

  const dir = usuarioThumbUploadDir();
  await mkdir(dir, { recursive: true });
  const arquivo = `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, arquivo), buf);
  return { arquivo };
}

export async function removerThumbArquivo(thumb: string): Promise<void> {
  if (!thumb || thumb === "nao.png") return;
  const nome = thumbNomeSeguro(thumb);
  if (!nome) return;
  const filePath = path.join(usuarioThumbUploadDir(), nome);
  try {
    await unlink(filePath);
  } catch {
    /* arquivo pode estar só no servidor Alex */
  }
}
