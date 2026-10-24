import "@/lib/load-env.server";
import mysql from "mysql2/promise";

import { JOAO_FINANCAS_DDL } from "./schema-bootstrap.server";

let pool: mysql.Pool | null = null;
let schemaReady: Promise<void> | null = null;

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Usa o mesmo MySQL do Minas Calhas (DB_*). MYSQL_* só como fallback legado. */
function requiredDb(name: "HOST" | "USER" | "PASSWORD" | "DATABASE"): string {
  const map = {
    HOST: ["DB_HOST", "MYSQL_HOST"],
    USER: ["DB_USER", "MYSQL_USER"],
    PASSWORD: ["DB_PASSWORD", "MYSQL_PASSWORD"],
    DATABASE: ["DB_NAME", "MYSQL_DATABASE"],
  } as const;
  for (const key of map[name]) {
    const value = env(key);
    if (value && value !== "COLOQUE_A_SENHA_AQUI") return value;
  }
  throw new Error(
    `Configure DB_${name === "DATABASE" ? "NAME" : name} no .env (banco Minas Calhas).`,
  );
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredDb("HOST"),
      port: Number(env("DB_PORT") || env("MYSQL_PORT") || 3306),
      database: requiredDb("DATABASE"),
      user: requiredDb("USER"),
      password: requiredDb("PASSWORD"),
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 8_000,
      dateStrings: true,
      namedPlaceholders: true,
      multipleStatements: true,
    });
  }
  return pool;
}

/** Cria tabelas do João Finanças no banco Minas Calhas (idempotente). */
export async function ensureJoaoFinancasSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await getPool().query(JOAO_FINANCAS_DDL);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: mysql.QueryValues,
) {
  await ensureJoaoFinancasSchema();
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
