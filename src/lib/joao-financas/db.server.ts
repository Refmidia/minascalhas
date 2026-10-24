import { config as loadEnv } from "dotenv";
import mysql from "mysql2/promise";

loadEnv();

let pool: mysql.Pool | null = null;

function env(name: string): string | undefined {
  return process.env[name];
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value || value === "COLOQUE_A_SENHA_AQUI") {
    throw new Error(
      `Configure ${name} no arquivo .env (banco Hostinger MySQL).`,
    );
  }
  return value;
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredEnv("MYSQL_HOST"),
      port: Number(env("MYSQL_PORT") || 3306),
      database: requiredEnv("MYSQL_DATABASE"),
      user: requiredEnv("MYSQL_USER"),
      password: requiredEnv("MYSQL_PASSWORD"),
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      namedPlaceholders: true,
    });
  }
  return pool;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params?: mysql.QueryValues,
) {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
