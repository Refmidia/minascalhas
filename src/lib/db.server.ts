/**
 * Prisma client singleton (server-only).
 *
 * Este arquivo só pode ser importado em código server (server functions,
 * server routes). Importar no client quebra o build.
 *
 * O client é resolvido dinamicamente para que o projeto compile mesmo
 * antes de `npx prisma generate` ter sido executado (ex.: no preview
 * Lovable, sem MySQL). No Cursor, após rodar:
 *
 *   npx prisma generate
 *
 * o módulo `@prisma/client` exportará `PrismaClient` normalmente.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = any;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientLike | undefined;
}

let _client: PrismaClientLike | undefined;

export async function getPrisma(): Promise<PrismaClientLike> {
  if (globalThis.__prisma) return globalThis.__prisma;
  if (_client) return _client;

  // Import dinâmico para evitar erro de tipos quando o client ainda
  // não foi gerado.
  const mod: { PrismaClient: new (opts?: unknown) => PrismaClientLike } =
    await import("@prisma/client");

  _client = new mod.PrismaClient({ log: ["warn", "error"] });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = _client;
  }
  return _client;
}
