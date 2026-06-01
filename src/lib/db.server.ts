/**
 * Prisma client singleton (server-only).
 */

import "@/lib/load-env.server";
import { getDatabaseUrl } from "@/lib/config.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientLike = any;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientLike | undefined;
}

let _client: PrismaClientLike | undefined;
let _clientUrl: string | undefined;

async function disconnectClient(client: PrismaClientLike | undefined) {
  if (!client?.$disconnect) return;
  try {
    await client.$disconnect();
  } catch {
    /* ignore */
  }
}

function prismaClientReady(client: PrismaClientLike | undefined): client is PrismaClientLike {
  return Boolean(client?.$queryRawUnsafe);
}

export async function getPrisma(): Promise<PrismaClientLike> {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Banco não configurado. Defina DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env.",
    );
  }

  const cached = _client ?? globalThis.__prisma;
  if (cached && _clientUrl === databaseUrl && prismaClientReady(cached)) {
    return cached;
  }
  if (cached && _clientUrl === databaseUrl) {
    await disconnectClient(_client);
    await disconnectClient(globalThis.__prisma);
    _client = undefined;
    globalThis.__prisma = undefined;
  }

  await disconnectClient(_client);
  await disconnectClient(globalThis.__prisma);
  _client = undefined;
  globalThis.__prisma = undefined;

  const mod = (await import("@prisma/client")) as unknown as {
    PrismaClient: new (opts?: { datasources?: { db: { url: string } }; log?: string[] }) => PrismaClientLike;
  };

  _clientUrl = databaseUrl;
  _client = new mod.PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["warn", "error"],
  });
  if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = _client;
  }
  return _client;
}
