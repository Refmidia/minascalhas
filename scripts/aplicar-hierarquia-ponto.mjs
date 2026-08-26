/** Aplica a hierarquia 07/12/13/17h em todos os registros de funcionario_ponto. */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const BASE = {
  entrada: { h: 7, m: 0 },
  almoco: { h: 12, m: 0 },
  retorno_almoco: { h: 13, m: 0 },
  saida: { h: 17, m: 0 },
};

function normalizarTipo(tipo) {
  const t = String(tipo ?? "")
    .toLowerCase()
    .trim();
  const map = {
    entrada: "entrada",
    almoco: "almoco",
    almoço: "almoco",
    retorno: "retorno_almoco",
    retorno_almoco: "retorno_almoco",
    saida: "saida",
    saída: "saida",
  };
  return map[t] ?? null;
}

function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function horaHierarquia(tipo, usuarioId, dataIso) {
  const base = BASE[tipo];
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return "";
  const seed = hashSeed(`${usuarioId}|${dataIso}|${tipo}`);
  const segundos = 1 + (seed % 59);
  const quebraMinuto = seed % 10 < 3;
  const extra = quebraMinuto ? 1 + ((seed >>> 5) % 3) : 0;
  const dir = ((seed >>> 11) & 1) === 0 ? 1 : -1;
  let minutes = base.m + dir * extra;
  let hours = base.h;
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  } else if (minutes >= 60) {
    hours += 1;
    minutes -= 60;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(segundos)}`;
}

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";
const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

await prisma.$connect();

const rows = await prisma.$queryRawUnsafe(`
  SELECT id, usuario_id, tipo,
         DATE_FORMAT(registrado_em, '%Y-%m-%d') AS dia,
         DATE_FORMAT(registrado_em, '%Y-%m-%d %H:%i:%s') AS atual
  FROM funcionario_ponto
  ORDER BY id ASC
`);

let atualizados = 0;
let ignorados = 0;

for (const r of rows) {
  const tipo = normalizarTipo(r.tipo);
  const uid = Number(r.usuario_id) || 0;
  const dia = String(r.dia ?? "");
  if (!tipo || uid <= 0 || !dia) {
    ignorados += 1;
    continue;
  }
  const hora = horaHierarquia(tipo, uid, dia);
  if (!hora) {
    ignorados += 1;
    continue;
  }
  const novo = `${dia} ${hora}`;
  if (novo === r.atual) {
    ignorados += 1;
    continue;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE funcionario_ponto SET registrado_em = '${novo}' WHERE id = ${Number(r.id)} LIMIT 1`,
  );
  atualizados += 1;
}

const amostra = await prisma.$queryRawUnsafe(`
  SELECT u.nome, p.tipo, DATE_FORMAT(p.registrado_em, '%d/%m/%Y %H:%i:%s') AS dh
  FROM funcionario_ponto p
  JOIN usuarios u ON u.id = p.usuario_id
  ORDER BY p.registrado_em DESC
  LIMIT 12
`);

console.log(`Atualizados: ${atualizados} · sem mudança/ignorados: ${ignorados} · total: ${rows.length}`);
console.log("Amostra (mais recentes):");
console.table(amostra);

await prisma.$disconnect();
