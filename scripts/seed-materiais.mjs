import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

/** Nome + valor de custo (venda não é alterada em registros existentes). */
const MATERIAIS = [
  { material: "Bocal", valor_custo: 25.0 },
  { material: "Calha Moldura Galvalume 0.43 mm Perfil: C/40", valor_custo: 12.52 },
  { material: "Calha Moldura Galvalume 0.43 mm Perfil: C/45", valor_custo: 14.09 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/100", valor_custo: 31.3 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/105", valor_custo: 32.87 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/110", valor_custo: 34.43 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/115", valor_custo: 36.0 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/120", valor_custo: 37.56 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/15", valor_custo: 4.64 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/20", valor_custo: 6.26 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/25", valor_custo: 7.83 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/30", valor_custo: 9.39 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/35", valor_custo: 10.96 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/40", valor_custo: 12.52 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/45", valor_custo: 14.09 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/50", valor_custo: 15.65 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/55", valor_custo: 17.22 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/60", valor_custo: 18.78 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/65", valor_custo: 20.35 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/70", valor_custo: 21.91 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/75", valor_custo: 23.48 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/80", valor_custo: 25.04 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/85", valor_custo: 26.61 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/90", valor_custo: 28.17 },
  { material: "Chapa Galvalume 0.43 mm - Perfil: C/95", valor_custo: 29.74 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/100", valor_custo: 36.5 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/105", valor_custo: 38.33 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/110", valor_custo: 40.15 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/115", valor_custo: 41.98 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/120", valor_custo: 43.75 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/75", valor_custo: 27.37 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/80", valor_custo: 29.2 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/85", valor_custo: 31.03 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/90", valor_custo: 32.85 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/95", valor_custo: 34.68 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/40", valor_custo: 14.6 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/45", valor_custo: 16.43 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/50", valor_custo: 18.25 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/55", valor_custo: 20.08 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/60", valor_custo: 21.9 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/65", valor_custo: 23.73 },
  { material: "Chapa Galvalume 0.50 mm - Perfil: C/70", valor_custo: 25.55 },
  { material: "Churrasqueira", valor_custo: 0 },
  { material: "Coifa de Cozinha chapa galvalume 0.43 modelo AX 69", valor_custo: 0 },
  { material: "Condutor Galvalume 0.43 mm Perfil: 4PL C/35", valor_custo: 10.96 },
  { material: "Condutor Galvalume 0.43 mm Perfil: 6PL C/50", valor_custo: 15.65 },
  { material: "Instalação de coifa Lanchonete", valor_custo: 175.0 },
  { material: "Manutenção", valor_custo: 0 },
  { material: "Mão de Obra", valor_custo: 0 },
  { material: "Mexer na madeira e cortar", valor_custo: 0 },
  { material: "Mexer na Telha", valor_custo: 50.0 },
  { material: "Passar manta líquida nas paredes", valor_custo: 175.0 },
  { material: "PU Veda Calhas Aluzinco IMP", valor_custo: 17.0 },
  { material: "Reboco de alvenaria", valor_custo: 35.0 },
  { material: "Revisao", valor_custo: 75.0 },
  { material: "Rufo Churrasqueira", valor_custo: 125.0 },
  { material: "Tampar calha de Coxo", valor_custo: 0 },
  { material: "Telhas TP Chapa Galvalume 0.43 mm", valor_custo: 0 },
  { material: "Telhas TP Chapa Galvalume 0.50 mm", valor_custo: 0 },
  { material: "Telhas TP Sanduiche Chapa Galvalume 0.43 mm", valor_custo: 0 },
  { material: "TELHAS TRAPÉZIO 0.50 AJF", valor_custo: 38.0 },
];

function normNome(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";

if (!user || !pass || !db || !host) {
  console.error("ERRO: configure DB_HOST, DB_USER, DB_PASSWORD e DB_NAME no .env");
  process.exit(1);
}

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();

  await prisma.$executeRawUnsafe(
    "ALTER TABLE materiais MODIFY COLUMN material VARCHAR(120) NULL",
  );

  const todos = await prisma.$queryRawUnsafe("SELECT id, material FROM materiais");
  const porNome = new Map();
  for (const row of todos) {
    porNome.set(normNome(row.material), row);
  }

  let criados = 0;
  let atualizados = 0;

  for (const item of MATERIAIS) {
    const custo = Number(item.valor_custo) || 0;
    const chave = normNome(item.material);
    const existente = porNome.get(chave);

    if (existente) {
      await prisma.$executeRawUnsafe(
        "UPDATE materiais SET material = ?, valor_custo = ? WHERE id = ?",
        item.material,
        custo,
        existente.id,
      );
      atualizados += 1;
      console.log(`Atualizado: ${item.material} — custo R$ ${custo.toFixed(2)}`);
    } else {
      await prisma.$executeRawUnsafe(
        "INSERT INTO materiais (material, valor_custo, valor) VALUES (?, ?, 0)",
        item.material,
        custo,
      );
      criados += 1;
      console.log(`Criado: ${item.material} — custo R$ ${custo.toFixed(2)}`);
    }
  }

  const total = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS n FROM materiais");
  const count = Array.isArray(total) && total[0] ? Number(total[0].n) : 0;
  console.log(
    `\nPronto. ${criados} criado(s), ${atualizados} atualizado(s). Total no banco: ${count}.`,
  );
} catch (err) {
  console.error("ERRO:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
