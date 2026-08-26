import { getPrisma } from "@/lib/db.server";

const ASSINATURA_MAX_BASE64 = 400_000;
const MIMES_OK = new Set(["image/png", "image/jpeg", "image/webp"]);

let assinaturaColsOk = false;

function intId(v: number): number {
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

export async function ensureAssinaturaColumns(
  prisma?: Awaited<ReturnType<typeof getPrisma>>,
): Promise<void> {
  if (assinaturaColsOk) return;
  const db = prisma ?? (await getPrisma());
  try {
    await db.$executeRawUnsafe(`ALTER TABLE usuarios ADD COLUMN assinatura_mime VARCHAR(64) NULL`);
  } catch {
    /* coluna já existe */
  }
  try {
    await db.$executeRawUnsafe(`ALTER TABLE usuarios ADD COLUMN assinatura_data MEDIUMTEXT NULL`);
  } catch {
    /* coluna já existe */
  }
  assinaturaColsOk = true;
}

export function parseAssinaturaDataUrl(raw: string): { mime: string; base64: string } | null {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw.trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!MIMES_OK.has(mime)) return null;
  const base64 = m[2].replace(/\s/g, "");
  if (!base64 || base64.length > ASSINATURA_MAX_BASE64) return null;
  return { mime, base64 };
}

export function dataUrlAssinatura(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

export async function getUsuarioAssinaturaDataUrl(id: number): Promise<string | null> {
  const prisma = await getPrisma();
  await ensureAssinaturaColumns(prisma);
  const rows = await prisma.$queryRawUnsafe<
    { assinatura_mime: string | null; assinatura_data: string | null }[]
  >(`SELECT assinatura_mime, assinatura_data FROM usuarios WHERE id = ? LIMIT 1`, intId(id));
  const row = rows[0];
  if (!row?.assinatura_data || !row.assinatura_mime) return null;
  return dataUrlAssinatura(row.assinatura_mime, row.assinatura_data);
}

export async function salvarUsuarioAssinatura(id: number, dataUrl: string): Promise<string | { erro: string }> {
  const parsed = parseAssinaturaDataUrl(dataUrl);
  if (!parsed) {
    return { erro: "Assinatura inválida. Desenhe de novo e salve." };
  }
  const prisma = await getPrisma();
  await ensureAssinaturaColumns(prisma);
  await prisma.$executeRawUnsafe(
    `UPDATE usuarios SET assinatura_mime = ?, assinatura_data = ? WHERE id = ?`,
    parsed.mime,
    parsed.base64,
    intId(id),
  );
  return dataUrlAssinatura(parsed.mime, parsed.base64);
}

export async function limparUsuarioAssinatura(id: number): Promise<void> {
  const prisma = await getPrisma();
  await ensureAssinaturaColumns(prisma);
  await prisma.$executeRawUnsafe(
    `UPDATE usuarios SET assinatura_mime = NULL, assinatura_data = NULL WHERE id = ?`,
    intId(id),
  );
}

export async function mapaAssinaturasDataUrl(ids: number[]): Promise<Record<number, string>> {
  const uniq = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniq.length === 0) return {};
  const prisma = await getPrisma();
  await ensureAssinaturaColumns(prisma);
  const placeholders = uniq.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<
    { id: unknown; assinatura_mime: string | null; assinatura_data: string | null }[]
  >(
    `SELECT id, assinatura_mime, assinatura_data FROM usuarios WHERE id IN (${placeholders})`,
    ...uniq,
  );
  const map: Record<number, string> = {};
  for (const row of rows) {
    if (!row.assinatura_data || !row.assinatura_mime) continue;
    map[intId(Number(row.id))] = dataUrlAssinatura(row.assinatura_mime, row.assinatura_data);
  }
  return map;
}

export async function mapaTemAssinatura(ids: number[]): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  const uniq = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  for (const id of uniq) map.set(id, false);
  if (uniq.length === 0) return map;
  const prisma = await getPrisma();
  await ensureAssinaturaColumns(prisma);
  const placeholders = uniq.map(() => "?").join(",");
  const rows = await prisma.$queryRawUnsafe<{ id: unknown }[]>(
    `SELECT id FROM usuarios
     WHERE id IN (${placeholders})
       AND assinatura_data IS NOT NULL
       AND assinatura_data <> ''`,
    ...uniq,
  );
  for (const row of rows) map.set(intId(Number(row.id)), true);
  return map;
}
