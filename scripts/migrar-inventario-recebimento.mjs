/**
 * Cria tabela inventario_recebimento (sinais e parcelas do cliente).
 *
 * Uso: node scripts/migrar-inventario-recebimento.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

function dbUrl() {
  const host = process.env.DB_HOST?.trim();
  const port = process.env.DB_PORT?.trim() || "3306";
  const user = process.env.DB_USER?.trim();
  const pass = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME?.trim();
  if (host && user && pass !== undefined && pass !== "" && name) {
    return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(name)}`;
  }
  return process.env.DATABASE_URL?.trim() || null;
}

const url = dbUrl();
if (!url) {
  console.error("Configure DB_* no .env");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const exists = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE 'inventario_recebimento'`);
  if (exists.length > 0) {
    console.log("Tabela inventario_recebimento já existe.");
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE inventario_recebimento (
        id INT NOT NULL AUTO_INCREMENT,
        inventario_id INT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'sinal',
        pago_em DATETIME NOT NULL,
        observacao VARCHAR(255) NULL,
        registrado_por INT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_inventario_recebimento_inv (inventario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Tabela inventario_recebimento criada.");
  }
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
