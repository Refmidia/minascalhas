import { readFileSync } from "fs";
import { resolve } from "path";
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

const env = loadEnvFile();
const url = `mysql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT || "3306"}/${encodeURIComponent(env.DB_NAME)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const sql = readFileSync(resolve(process.cwd(), "scripts/dumps/admin-inicial-minascalhas.sql"), "utf8")
  .replace(/^--.*$/gm, "")
  .trim();

try {
  const exists = await prisma.$queryRawUnsafe(
    `SELECT id FROM usuarios WHERE TRIM(usuario) = 'admin' LIMIT 1`,
  );
  if (exists.length) {
    console.log("Admin já existe:", exists[0]);
  } else {
    await prisma.$executeRawUnsafe(sql);
    console.log("Admin criado: usuario=admin / senha=admin123");
  }
} finally {
  await prisma.$disconnect();
}
