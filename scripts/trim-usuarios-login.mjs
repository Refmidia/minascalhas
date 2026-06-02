/** Remove espaços no campo usuario (ex.: "Bryan " → "Bryan"). */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";
const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const r = await prisma.$executeRawUnsafe(`UPDATE usuarios SET usuario = TRIM(usuario)`);
  console.log("Logins normalizados (TRIM). Linhas afetadas:", r);
} finally {
  await prisma.$disconnect();
}
