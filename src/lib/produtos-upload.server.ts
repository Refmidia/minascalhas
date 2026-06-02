import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { uploadPublicBlob } from "@/lib/blob-upload.server";
import {
  canPersistUploadsOnDisk,
  isReadOnlyServerless,
  mensagemUploadIndisponivel,
  resolveUploadDir,
} from "@/lib/upload-dir.server";

export const FOTOS_TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const FOTOS_MAX_BYTES = 8 * 1024 * 1024;

export function produtosUploadDir(): string {
  return resolveUploadDir("PRODUTOS_UPLOAD_DIR", ["images", "produtos"]);
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

export function isFotoStoredUrl(arquivo: string): boolean {
  return /^https?:\/\//i.test(arquivo.trim());
}

export function fotoPublicUrl(arquivo: string): string {
  if (isFotoStoredUrl(arquivo)) return arquivo;
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/produtos/${encodeURIComponent(name)}`;
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

  const key = `produtos/${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;

  if (isReadOnlyServerless()) {
    const blob = await uploadPublicBlob(key, file);
    if ("erro" in blob) return { erro: blob.erro };
    return { arquivo: blob.url };
  }

  if (!canPersistUploadsOnDisk("PRODUTOS_UPLOAD_DIR")) {
    return { erro: mensagemUploadIndisponivel("foto de produto") };
  }

  const dir = produtosUploadDir();
  await mkdir(dir, { recursive: true });
  const arquivo = `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, arquivo), buf);
  return { arquivo };
}
