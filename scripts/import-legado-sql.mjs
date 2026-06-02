/**
 * Importa dump .sql do site antigo (phpMyAdmin) para o banco atual (Hostinger).
 * Uso:
 *   node scripts/import-legado-sql.mjs "c:\caminho\dump.sql"
 *   node scripts/import-legado-sql.mjs --dry-run "c:\caminho\dump.sql"
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const dryRun = process.argv.includes("--dry-run");
const fileArg = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".sql"));

const TABLES_ORDER = [
  "usuarios",
  "fornecedores",
  "materiais",
  "material_fornecedor_liberacao",
  "inventario",
  "funcionario_ponto",
  "fornecedor_entregas",
  "fornecedor_entrega_itens",
];

function dbUrl() {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;
  if (!host || !user || !pass || !name) return null;
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`;
}

function findStatementEnd(sql, start) {
  let inString = false;
  let escape = false;
  let quote = "";
  for (let i = start; i < sql.length; i++) {
    const c = sql[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quote) inString = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      quote = c;
      continue;
    }
    if (c === ";") return i;
  }
  return -1;
}

function extractInserts(sql, tables) {
  const allowed = new Set(tables);
  const byTable = Object.fromEntries(tables.map((t) => [t, []]));
  let pos = 0;

  while (pos < sql.length) {
    const idx = sql.indexOf("INSERT INTO `", pos);
    if (idx === -1) break;
    const t0 = idx + "INSERT INTO `".length;
    const t1 = sql.indexOf("`", t0);
    const table = sql.slice(t0, t1);
    const end = findStatementEnd(sql, idx);
    if (end === -1) break;
    const stmt = sql.slice(idx, end + 1);
    if (allowed.has(table)) {
      const ignore = stmt.replace(/^INSERT INTO/i, "INSERT IGNORE INTO");
      byTable[table].push(ignore);
    }
    pos = end + 1;
  }
  return byTable;
}

function countRowsInInsert(sql) {
  let n = 0;
  let inString = false;
  let escape = false;
  let quote = "";
  const valuesIdx = sql.indexOf("VALUES");
  if (valuesIdx === -1) return 0;
  for (let i = valuesIdx; i < sql.length; i++) {
    const c = sql[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === quote) inString = false;
      continue;
    }
    if (c === "'" || c === '"') {
      inString = true;
      quote = c;
      continue;
    }
    if (c === "(" && sql[i - 1] !== "_") {
      const prev = sql.slice(Math.max(0, i - 8), i);
      if (!prev.includes("INSERT") && !prev.includes("IGNORE")) n++;
    }
  }
  return Math.max(0, n - 1);
}

async function main() {
  const sqlPath = fileArg
    ? resolve(fileArg)
    : resolve(process.cwd(), "scripts/dumps/legado.sql");

  const targetUrl = dbUrl();
  if (!targetUrl) {
    console.error("Configure DB_* no .env");
    process.exit(1);
  }

  let sql;
  try {
    sql = readFileSync(sqlPath, "utf8");
  } catch {
    console.error("Arquivo não encontrado:", sqlPath);
    process.exit(1);
  }

  console.log(dryRun ? "[DRY-RUN] " : "", "Arquivo:", sqlPath);
  console.log("Tamanho:", (sql.length / 1024).toFixed(1), "KB\n");

  const byTable = extractInserts(sql, TABLES_ORDER);
  let totalStmts = 0;
  let totalRows = 0;

  for (const table of TABLES_ORDER) {
    const stmts = byTable[table] ?? [];
    const rows = stmts.reduce((s, st) => s + countRowsInInsert(st), 0);
    totalStmts += stmts.length;
    totalRows += rows;
    console.log(`  ${table}: ${stmts.length} INSERT(s), ~${rows} linha(s)`);
  }

  if (dryRun) {
    console.log("\nTotal:", totalStmts, "comandos,", totalRows, "linhas (aprox.)");
    console.log("Rode sem --dry-run para importar.");
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });
  try {
    await prisma.$connect();
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of TABLES_ORDER) {
      const stmts = byTable[table] ?? [];
      if (stmts.length === 0) continue;
      console.log(`\nImportando ${table}...`);
      for (const stmt of stmts) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`  ERRO em ${table}:`, msg.slice(0, 200));
          throw e;
        }
      }
      const c = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${table}\``);
      console.log(`  OK — total na tabela agora:`, Number(c[0].c));
    }

    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    console.log("\nImportação concluída.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
