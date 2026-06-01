/**
 * Prisma client singleton (server-only).
 *
 * Este arquivo só pode ser importado em código server (server functions,
 * server routes). Importar no client quebra o build.
 *
 * Requer `DATABASE_URL` no ambiente e `npx prisma generate` rodado uma vez.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
