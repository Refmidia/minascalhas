/** Completa jornada (almoço/retorno/saída) em dias que já têm ponto e faltou batida. */
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

const SEQUENCIA = ["entrada", "almoco", "retorno_almoco", "saida"];

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

function hojeIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const url = `mysql://${encodeURIComponent(process.env.DB_USER)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT || "3306"}/${encodeURIComponent(process.env.DB_NAME)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

await prisma.$connect();

const hoje = hojeIso();
const rows = await prisma.$queryRawUnsafe(`
  SELECT p.usuario_id, u.nome,
         DATE_FORMAT(p.registrado_em, '%Y-%m-%d') AS dia,
         GROUP_CONCAT(p.tipo ORDER BY p.registrado_em, p.id) AS tipos
  FROM funcionario_ponto p
  JOIN usuarios u ON u.id = p.usuario_id
  GROUP BY p.usuario_id, DATE(p.registrado_em)
  ORDER BY dia, u.nome
`);

let inseridos = 0;
const log = [];

for (const r of rows) {
  const uid = Number(r.usuario_id) || 0;
  const dia = String(r.dia ?? "");
  if (uid <= 0 || !dia) continue;
  if (dia >= hoje) continue;

  const tipos = new Set(
    String(r.tipos ?? "")
      .split(",")
      .map((t) => normalizarTipo(t))
      .filter(Boolean),
  );
  if (!tipos.has("entrada")) continue;

  for (const tipo of SEQUENCIA) {
    if (tipos.has(tipo)) continue;
    const hora = horaHierarquia(tipo, uid, dia);
    if (!hora) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO funcionario_ponto (usuario_id, tipo, registrado_em)
       VALUES (${uid}, '${tipo}', '${dia} ${hora}')`,
    );
    inseridos += 1;
    log.push({ nome: r.nome, dia, tipo, hora });
  }
}

console.log(`Dias com ponto incompleto (antes de hoje): ${log.length ? [...new Set(log.map((x) => x.nome + "|" + x.dia))].length : 0}`);
console.log(`Batidas criadas: ${inseridos}`);
if (log.length) console.table(log);

await prisma.$disconnect();
