import { resolveUploadDir } from "@/lib/upload-dir.server";

export { fotoPublicUrl, isFotoStoredUrl } from "@/lib/produto-foto-url";

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

/** Lê a imagem para gravar no MySQL (sem Blob). */
export async function lerImagemUpload(
  file: File,
): Promise<{ mime: string; base64: string } | { erro: string }> {
  const mime = resolverMimeImagem(file);
  if (!mime) {
    return { erro: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou outra imagem comum." };
  }
  if (file.size > FOTOS_MAX_BYTES) {
    return { erro: "Arquivo maior que 8 MB." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 32) {
    return { erro: "Arquivo de imagem inválido." };
  }
  return { mime, base64: buf.toString("base64") };
}
