/**
 * Cria ou atualiza um usuário admin.
 * Uso: node scripts/criar-admin.mjs <usuario> <senha> [nome]
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile() {
  const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
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

const login = process.argv[2]?.trim();
const senha = process.argv[3];
const nome = process.argv[4]?.trim() || login;

if (!login || !senha) {
  console.error("Uso: node scripts/criar-admin.mjs <usuario> <senha> [nome]");
  process.exit(1);
}

const env = loadEnvFile();
const url = `mysql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT || "3306"}/${encodeURIComponent(env.DB_NAME)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const hash = (await bcrypt.hash(senha, 10)).replace(/^\$2[ab]\$/, "$2y$");

try {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, usuario, nome, nivel FROM usuarios WHERE TRIM(usuario) = ? LIMIT 1`,
    login,
  );

  if (rows?.length) {
    const u = rows[0];
    await prisma.$executeRawUnsafe(
      `UPDATE usuarios SET senha = ?, nome = ?, nivel = 'admin' WHERE id = ?`,
      hash,
      nome,
      u.id,
    );
    console.log("Admin atualizado:", { id: u.id, usuario: login, nome, senha: "(definida)" });
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO usuarios (thumb, nome, email, usuario, senha, nivel, fornecedor_id, valor_diario)
       VALUES ('default.png', ?, '', ?, ?, 'admin', NULL, 0.00)`,
      nome,
      login,
      hash,
    );
    const created = await prisma.$queryRawUnsafe(
      `SELECT id, usuario, nome FROM usuarios WHERE TRIM(usuario) = ? LIMIT 1`,
      login,
    );
    console.log("Admin criado:", created[0], { senha: "(definida)" });
  }
} catch (e) {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
