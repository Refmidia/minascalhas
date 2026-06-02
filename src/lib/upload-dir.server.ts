import path from "node:path";

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
 * Pasta para salvar uploads.
 * - Local: `public/images/...`
 * - Serverless sem env custom: `/tmp/...` (só na mesma invocação; prefira env ou Hostinger)
 */
export function resolveUploadDir(envVar: string, segments: string[]): string {
  const custom = process.env[envVar]?.trim();
  if (custom) return path.resolve(custom);
  if (isReadOnlyServerless()) {
    return path.join("/tmp", "alex-calhas-uploads", ...segments);
  }
  return path.resolve(process.cwd(), "public", ...segments);
}

/** Upload persistente entre requisições (painel em produção na Vercel precisa de env ou Blob). */
export function canPersistUploads(envVar: string): boolean {
  if (process.env[envVar]?.trim()) return true;
  return !isReadOnlyServerless();
}

export function mensagemUploadIndisponivel(tipo: "foto de produto" | "foto de perfil"): string {
  return (
    `Não foi possível salvar ${tipo} neste servidor (ambiente serverless). ` +
    `Faça o upload pelo painel no Hostinger/servidor com disco, ou configure uma pasta gravável ` +
    `(PRODUTOS_UPLOAD_DIR / USER_THUMB_DIR). Para avatares antigos, use VITE_USER_THUMB_BASE.`
  );
}
