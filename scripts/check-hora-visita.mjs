import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  `SELECT id, \`data-visita\` AS dv, \`hora-visita\` AS hv
   FROM inventario WHERE status = 'agendado' ORDER BY id DESC LIMIT 8`,
);
console.table(rows);
await prisma.$disconnect();
