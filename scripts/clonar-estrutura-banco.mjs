/**
 * Copia só a ESTRUTURA (CREATE TABLE) de um banco origem para o banco do .env.
 * Não copia dados. Origem: leitura. Destino: cria tabelas vazias.
 *
 * Uso:
 *   node scripts/clonar-estrutura-banco.mjs --dry-run
 *   node scripts/clonar-estrutura-banco.mjs --confirm
 *   node scripts/clonar-estrutura-banco.mjs --confirm --sql scripts/dumps/estrutura-minascalhas.sql
 *
 * Origem (somente leitura) — defina no .env ou usa padrão Alex:
 *   SOURCE_DB_HOST, SOURCE_DB_USER, SOURCE_DB_PASSWORD, SOURCE_DB_NAME
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm");
const sqlOut = (() => {
  const i = process.argv.indexOf("--sql");
  return i >= 0 ? resolve(process.argv[i + 1]) : null;
})();

function envKey(prefix, key) {
  return prefix ? `${prefix}_${key}` : key;
}

function cfg(prefix = "") {
  const host = process.env[envKey(prefix, "DB_HOST")]?.trim();
  const port = process.env[envKey(prefix, "DB_PORT")]?.trim() || "3306";
  const user = process.env[envKey(prefix, "DB_USER")]?.trim();
  const pass = process.env[envKey(prefix, "DB_PASSWORD")];
  const name = process.env[envKey(prefix, "DB_NAME")]?.trim();
  if (!host || !user || pass === undefined || pass === "" || !name) return null;
  return {
    host,
    name,
    user,
    url: `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`,
  };
}

async function tabelas(prisma) {
  const rows = await prisma.$queryRawUnsafe("SHOW TABLES");
  return rows.map((r) => String(Object.values(r)[0]));
}

async function showCreate(prisma, tabela) {
  const rows = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${tabela}\``);
  const row = rows[0];
  const key = Object.keys(row).find((k) => k.toLowerCase().includes("create"));
  return String(row[key ?? "Create Table"]);
}

async function main() {
  const source =
    cfg("SOURCE") ??
    cfg("LEGACY") ?? {
      host: "193.203.175.84",
      name: "u101686138_alexcalhas",
      user: "u101686138_alexcalhas",
      url: null,
    };

  if (!source.url) {
    const pass = process.env.SOURCE_DB_PASSWORD ?? process.env.LEGACY_DB_PASSWORD;
    if (!pass) {
      console.error(
        "Defina SOURCE_DB_* no .env (banco de referência, só leitura) ou LEGACY_DB_PASSWORD.",
      );
      process.exit(1);
    }
    source.url = `mysql://${encodeURIComponent(source.user)}:${encodeURIComponent(pass)}@${source.host}:3306/${encodeURIComponent(source.name)}`;
  }

  const target = cfg();
  if (!target) {
    console.error("Defina DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env (banco NOVO).");
    process.exit(1);
  }

  if (!dryRun && !confirm && !sqlOut) {
    console.error("Use --dry-run, --confirm ou --sql arquivo.sql");
    process.exit(1);
  }

  const src = new PrismaClient({ datasources: { db: { url: source.url } } });

  try {
    await src.$connect();
    console.log("Origem (leitura):", source.name, "@", source.host);

    const lista = await tabelas(src);
    console.log(`Tabelas encontradas: ${lista.length}`);

    const statements = [];
    for (const t of lista) {
      const ddl = await showCreate(src, t);
      statements.push(`DROP TABLE IF EXISTS \`${t}\`;`);
      statements.push(`${ddl};`);
      statements.push("");
    }

    const sql = [
      "-- Estrutura gerada automaticamente — sem dados",
      "SET FOREIGN_KEY_CHECKS = 0;",
      "",
      ...statements,
      "SET FOREIGN_KEY_CHECKS = 1;",
      "",
    ].join("\n");

    if (sqlOut) {
      writeFileSync(sqlOut, sql, "utf8");
      console.log(`\nArquivo salvo: ${sqlOut}`);
      console.log("Importe no phpMyAdmin → banco u945870447_minascalhas → Importar");
      return;
    }

    if (dryRun) {
      console.log("\n[DRY-RUN] Primeiras tabelas:", lista.slice(0, 5).join(", "), "...");
      return;
    }

    const dst = new PrismaClient({ datasources: { db: { url: target.url } } });
    try {
      await dst.$connect();
      console.log("Destino:", target.name, "@", target.host);
      await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      for (const t of lista) {
        const ddl = await showCreate(src, t);
        await dst.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${t}\``);
        await dst.$executeRawUnsafe(ddl);
        console.log("  OK", t);
      }
      await dst.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
      console.log("\nEstrutura criada com sucesso.");
    } finally {
      await dst.$disconnect();
    }
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : e);
    if (String(e?.message ?? e).includes("Authentication failed")) {
      console.error(
        "\nDica: confira DB_HOST no .env — cada conta Hostinger tem hostname/IP próprio\n" +
          "(hPanel → Bancos de dados → MySQL remoto, topo da página).",
      );
    }
    process.exit(1);
  } finally {
    await src.$disconnect();
  }
}

main();
