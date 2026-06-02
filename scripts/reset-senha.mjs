/**
 * Atualiza senha na tabela usuarios com hash bcrypt (compatível PHP $2y$).
 *
 * Uso:
 *   node scripts/reset-senha.mjs <usuario> <senha>
 *   node scripts/reset-senha.mjs bryan 686474
 */
import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const login = process.argv[2];
const senha = process.argv[3];

if (!login || !senha) {
  console.error("Uso: node scripts/reset-senha.mjs <usuario> <senha>");
  process.exit(1);
}

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";

if (!user || !pass || !db || !host) {
  console.error("Defina DB_USER, DB_PASSWORD, DB_NAME e DB_HOST no .env");
  process.exit(1);
}

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const hash = (await bcrypt.hash(senha, 10)).replace(/^\$2[ab]\$/, "$2y$");

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, usuario, nome, nivel FROM usuarios WHERE TRIM(usuario) = ? LIMIT 1`,
    login.trim(),
  );
  if (!rows?.length) {
    console.error(`Usuário "${login}" não encontrado.`);
    process.exit(1);
  }
  const u = rows[0];
  await prisma.$executeRawUnsafe(`UPDATE usuarios SET senha = ? WHERE id = ?`, hash, u.id);
  console.log("Senha atualizada com hash bcrypt.");
  console.log({ id: u.id, usuario: u.usuario, nome: u.nome, nivel: u.nivel });
  console.log("\nHash gravado (referência):");
  console.log(hash);
} catch (e) {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
