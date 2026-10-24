import type { getPrisma } from "@/lib/db.server";

type Prisma = Awaited<ReturnType<typeof getPrisma>>;

type ColDef = { name: string; ddl: string };

/**
 * Garante colunas sem disparar ALTER quando já existem
 * (ALTER falho no MySQL remoto custa segundos por request na Vercel).
 */
export async function ensureMysqlColumns(
  prisma: Prisma,
  table: string,
  columns: ColDef[],
  cache: { ok: boolean },
): Promise<void> {
  if (cache.ok) return;

  const names = columns.map((c) => c.name);
  const placeholders = names.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME IN (${placeholders})`,
    table,
    ...names,
  );
  const existing = new Set(rows.map((r) => r.COLUMN_NAME));

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN ${col.ddl}`);
    } catch {
      /* corrida com outra instância */
    }
  }

  cache.ok = true;
}
