import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { uploadBlob } from "@/lib/blob-upload.server";
import { blobUrlParaExibicao, isBlobPrivateRef } from "@/lib/usuario-thumb-url";
import {
  canPersistUploadsOnDisk,
  isReadOnlyServerless,
  mensagemUploadIndisponivel,
  resolveUploadDir,
} from "@/lib/upload-dir.server";

export const FOTOS_TIPOS = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
  "image/heic",
  "image/heif",
]);
export const FOTOS_MAX_BYTES = 8 * 1024 * 1024;

const EXT_PARA_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

/** Normaliza MIME (Windows às vezes manda vazio ou image/jpg). */
export function resolverMimeImagem(file: File): string | null {
  const type = file.type?.trim().toLowerCase();
  if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
  if (type && type.startsWith("image/")) return type;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_PARA_MIME[ext] ?? null;
}

export function imagemUploadPermitida(file: File): boolean {
  return resolverMimeImagem(file) != null;
}

export function produtosUploadDir(): string {
  return resolveUploadDir("PRODUTOS_UPLOAD_DIR", ["images", "produtos"]);
}

export function extensaoSegura(mime: string): string | null {
  const norm =
    mime === "image/jpg" || mime === "image/pjpeg" ? "image/jpeg" : mime.trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return map[norm] ?? null;
}

export function extensaoFromNomeArquivo(nome: string): string | null {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || ext.length > 8 || !/^[a-z0-9]+$/.test(ext)) return null;
  return ext;
}

export function isFotoStoredUrl(arquivo: string): boolean {
  return /^https?:\/\//i.test(arquivo.trim());
}

export function fotoPublicUrl(arquivo: string): string {
  if (isBlobPrivateRef(arquivo) || isFotoStoredUrl(arquivo)) {
    return blobUrlParaExibicao(arquivo);
  }
  const name = arquivo.replace(/^\/+/, "").split(/[/\\]/).pop() ?? arquivo;
  return `/images/produtos/${encodeURIComponent(name)}`;
}

export async function salvarFotoUpload(file: File): Promise<{ arquivo: string } | { erro: string }> {
  const mime = resolverMimeImagem(file);
  if (!mime) {
    return { erro: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou outra imagem comum." };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 5 MB." };
  }
  const ext = extensaoSegura(mime) ?? extensaoFromNomeArquivo(file.name) ?? "jpg";

  const key = `produtos/${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`;

  if (isReadOnlyServerless()) {
    const blob = await uploadBlob(key, file);
    if ("erro" in blob) return { erro: blob.erro };
    return { arquivo: blob.stored };
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
