import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";

if (!user || !pass || !db || !host) {
  console.error("Defina DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env");
  process.exit(1);
}

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'produtos_site'
       AND COLUMN_NAME = 'sem_imagem_padrao'`,
  );
  const existe = Number(rows[0]?.n ?? 0) > 0;
  if (existe) {
    console.log("Coluna sem_imagem_padrao já existe.");
  } else {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE produtos_site
       ADD COLUMN sem_imagem_padrao TINYINT NOT NULL DEFAULT 0
       AFTER ordem`,
    );
    console.log("Coluna sem_imagem_padrao criada com sucesso.");
  }
} catch (e) {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
