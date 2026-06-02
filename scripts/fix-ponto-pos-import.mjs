/** Corrige conflitos de ID após import do dump (remove testes errados + completa jornada 01/06). */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
const url = `mysql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT || "3306"}/${encodeURIComponent(process.env.DB_NAME)}`;
const p = new PrismaClient({ datasources: { db: { url } } });

await p.$connect();

// Registros de teste / duplicados que bloquearam o dump
await p.$executeRawUnsafe(`DELETE FROM funcionario_ponto WHERE id IN (23, 24, 25, 26, 27, 28, 29)`);

const faltam = [
  [28, "retorno_almoco", "2026-06-01 13:44:12"],
  [27, "saida", "2026-06-01 16:30:19"],
  [28, "saida", "2026-06-01 16:31:33"],
];

for (const [uid, tipo, dt] of faltam) {
  const exists = await p.$queryRawUnsafe(
    `SELECT id FROM funcionario_ponto WHERE usuario_id=${uid} AND tipo='${tipo}'
     AND registrado_em >= '2026-06-01 00:00:00' AND registrado_em <= '2026-06-01 23:59:59' LIMIT 1`,
  );
  if (exists[0]) continue;
  await p.$executeRawUnsafe(
    `INSERT INTO funcionario_ponto (usuario_id, tipo, registrado_em) VALUES (${uid}, '${tipo}', '${dt}')`,
  );
}

const rows = await p.$queryRawUnsafe(
  `SELECT p.id, u.nome, p.tipo, DATE_FORMAT(p.registrado_em,'%d/%m/%Y %H:%i:%s') AS dh
   FROM funcionario_ponto p JOIN usuarios u ON u.id=p.usuario_id
   WHERE p.registrado_em >= '2026-06-01' AND p.registrado_em < '2026-06-02'
   ORDER BY u.nome, p.registrado_em`,
);
console.log("Ponto 01/06/2026 após correção:\n", rows);
await p.$disconnect();
