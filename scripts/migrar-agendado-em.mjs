/**
 * Cria coluna agendado_em e preenche hora-visita vazia (visitas antigas).
 *
 * Uso:
 *   node scripts/migrar-agendado-em.mjs
 *   node scripts/migrar-agendado-em.mjs --dry-run
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

async function colunaExiste() {
  const rows = await prisma.$queryRawUnsafe(
    `SHOW COLUMNS FROM inventario LIKE 'agendado_em'`,
  );
  return rows.length > 0;
}

async function main() {
  if (!(await colunaExiste())) {
    console.log("Adicionando coluna agendado_em…");
    if (!dryRun) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE inventario ADD COLUMN agendado_em DATETIME NULL DEFAULT NULL AFTER \`hora-visita\``,
      );
    }
  } else {
    console.log("Coluna agendado_em já existe.");
  }

  const semAgendado = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n FROM inventario WHERE agendado_em IS NULL AND status = 'agendado'`,
  );
  console.log(`Agendados sem agendado_em: ${semAgendado[0]?.n ?? 0}`);

  if (!dryRun) {
    await prisma.$executeRawUnsafe(
      `UPDATE inventario
       SET agendado_em = CONCAT(
         STR_TO_DATE(REPLACE(TRIM(\`data-visita\`), '-', '.'), '%d.%m.%Y'),
         ' 09:00:00'
       )
       WHERE agendado_em IS NULL
         AND status = 'agendado'
         AND TRIM(\`data-visita\`) REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'`,
    );

    const upd = await prisma.$executeRawUnsafe(
      `UPDATE inventario
       SET \`hora-visita\` = DATE_FORMAT(agendado_em, '%H:%i')
       WHERE agendado_em IS NOT NULL
         AND (TRIM(\`hora-visita\`) = '' OR \`hora-visita\` IS NULL)`,
    );
    console.log("Linhas com hora-visita preenchida:", upd);
  } else {
    console.log("Dry-run — nenhuma alteração gravada.");
  }

  const amostra = await prisma.$queryRawUnsafe(
    `SELECT id, \`data-visita\` AS dv, \`hora-visita\` AS hv, agendado_em
     FROM inventario WHERE status = 'agendado' ORDER BY id DESC LIMIT 5`,
  );
  console.table(amostra);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
