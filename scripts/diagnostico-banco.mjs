import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnvFile();
const host = env.DB_HOST;
const user = env.DB_USER;
const pass = env.DB_PASSWORD;
const db = env.DB_NAME;
const port = env.DB_PORT || "3306";

console.log("Testando conexão remota MySQL (lendo .env do disco)...");
console.log("  Host:", host);
console.log("  Porta:", port);
console.log("  Usuário:", user);
console.log("  Banco:", db);
console.log("  Senha:", pass ? `( ${pass.length} caracteres )` : "(vazia)");
console.log("");

if (!host || !user || !pass || !db) {
  console.error("DB_HOST, DB_USER, DB_PASSWORD e DB_NAME são obrigatórios no .env");
  process.exit(1);
}

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();
  console.log("Conexão: OK");

  const tables = await prisma.$queryRawUnsafe("SHOW TABLES");
  console.log("Tabelas:", tables.length);
  for (const r of tables) console.log(" ", Object.values(r)[0]);

  if (tables.length === 0) {
    console.log("\nBanco vazio — importe scripts/dumps/estrutura-minascalhas.sql no phpMyAdmin");
  }

  try {
    const admins = await prisma.$queryRawUnsafe(
      `SELECT id, usuario, nome FROM usuarios WHERE LOWER(TRIM(nivel)) = 'admin' LIMIT 5`,
    );
    console.log("Admins:", admins.length ? admins : "(nenhum — importe admin-inicial-minascalhas.sql)");
  } catch {
    console.log("Tabela usuarios ainda não existe.");
  }
} catch (e) {
  console.error("Conexão: FALHOU");
  console.error("Erro:", e instanceof Error ? e.message : e);
  console.error("");
  console.error("Checklist:");
  console.error("  1. Senha no .env = senha do usuário MySQL no hPanel");
  console.error("  2. hPanel → MySQL remoto → adicionar SEU IP público");
  console.error("  3. Host correto da conta nova (193.203.175.122)");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
