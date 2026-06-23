import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();
  const admins = await prisma.usuario.findMany({
    where: { nivel: "admin" },
    select: { id: true, usuario: true, nome: true },
  });
  console.log("Conexão OK. Admins:", admins);
  const count = await prisma.inventario.count();
  console.log("Registros em inventario:", count);
} catch (e) {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
