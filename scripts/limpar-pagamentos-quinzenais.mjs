/**
 * Limpa lançamentos de pagamento de funcionário (modelo antigo quinzenal/semanal)
 * para reiniciar no modelo mensal.
 *
 * Uso:
 *   node scripts/limpar-pagamentos-quinzenais.mjs --dry-run
 *   node scripts/limpar-pagamentos-quinzenais.mjs --confirm
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm");

const TABELAS = [
  "funcionario_pagamento_vale",
  "funcionario_pagamento_empreita",
  "funcionario_pagamento_semanal",
];

function dbUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "3306";
  const name = process.env.DB_NAME;
  if (!user || !pass || !host || !name) {
    throw new Error("Defina DATABASE_URL ou DB_HOST/DB_USER/DB_PASSWORD/DB_NAME no .env");
  }
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`;
}

async function contar(prisma, tabela) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${tabela}\``);
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  if (!dryRun && !confirm) {
    console.error("Use --dry-run (só conta) ou --confirm (apaga os lançamentos).");
    process.exit(1);
  }

  const url = dbUrl();
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  await prisma.$connect();

  console.log(dryRun ? "DRY-RUN — nada será apagado\n" : "CONFIRM — limpando lançamentos\n");

  const counts = {};
  for (const t of TABELAS) {
    try {
      counts[t] = await contar(prisma, t);
      console.log(`  ${t}: ${counts[t]} registro(s)`);
    } catch (e) {
      counts[t] = null;
      console.log(`  ${t}: (tabela ausente ou erro) ${e.message}`);
    }
  }

  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of TABELAS) {
    if (counts[t] == null) continue;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
    console.log(`  truncado: ${t}`);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

  console.log("\nPronto. Pagamentos passam a ser lançados por mês (dia 1 ao último dia).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
