import path from "node:path";

import { hasBlobStorage } from "@/lib/blob-upload.server";

/** Vercel / Lambda: disco local em `public/` não é gravável. */
export function isReadOnlyServerless(): boolean {
  return Boolean(
    process.env.VERCEL === "1" ||
      process.env.VERCEL === "true" ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

/**
 * Pasta para salvar uploads no disco (somente ambiente local ou servidor com disco).
 */
export function resolveUploadDir(envVar: string, segments: string[]): string {
  const custom = process.env[envVar]?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "public", ...segments);
}

/** Upload em disco local (não usar na Vercel sem USER_THUMB_DIR / PRODUTOS_UPLOAD_DIR). */
export function canPersistUploadsOnDisk(envVar: string): boolean {
  if (process.env[envVar]?.trim()) return true;
  return !isReadOnlyServerless();
}

export function mensagemUploadIndisponivel(tipo: "foto de produto" | "foto de perfil"): string {
  const blob = hasBlobStorage()
    ? "O Blob está configurado — faça um novo deploy do site na Vercel com o código mais recente."
    : "Na Vercel: Storage → Blob → Connect Project ao site e Redeploy.";
  return (
    `Não foi possível salvar ${tipo}. ${blob} ` +
    `No PC (npm run dev) o upload usa public/images/. Fotos antigas: VITE_USER_THUMB_BASE.`
  );
}
