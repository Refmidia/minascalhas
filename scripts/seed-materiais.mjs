import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const MATERIAIS = [
  "Bocal",
  "Calha Moldura Galvalume 0.43 mm Perfil:  C/40",
  "Calha Moldura Galvalume 0.43 mm Perfil:  C/45",
  "Chapa Galvalume 0.43 mm - Perfil:  C/100",
  "Chapa Galvalume 0.43 mm - Perfil:  C/105",
  "Chapa Galvalume 0.43 mm - Perfil:  C/110",
  "Chapa Galvalume 0.43 mm - Perfil:  C/115",
  "Chapa Galvalume 0.43 mm - Perfil:  C/120",
  "Chapa Galvalume 0.43 mm - Perfil:  C/15",
  "Chapa Galvalume 0.43 mm - Perfil:  C/20",
  "Chapa Galvalume 0.43 mm - Perfil:  C/25",
  "Chapa Galvalume 0.43 mm - Perfil:  C/30",
  "Chapa Galvalume 0.43 mm - Perfil:  C/35",
  "Chapa Galvalume 0.43 mm - Perfil:  C/40",
  "Chapa Galvalume 0.43 mm - Perfil:  C/45",
  "Chapa Galvalume 0.43 mm - Perfil:  C/50",
  "Chapa Galvalume 0.43 mm - Perfil:  C/55",
  "Chapa Galvalume 0.43 mm - Perfil:  C/60",
  "Chapa Galvalume 0.43 mm - Perfil:  C/65",
  "Chapa Galvalume 0.43 mm - Perfil:  C/70",
  "Chapa Galvalume 0.43 mm - Perfil:  C/75",
  "Chapa Galvalume 0.43 mm - Perfil:  C/80",
  "Chapa Galvalume 0.43 mm - Perfil:  C/85",
  "Chapa Galvalume 0.43 mm - Perfil:  C/90",
  "Chapa Galvalume 0.43 mm - Perfil:  C/95",
  "Chapa Galvalume 0.50 mm - Perfil:  C/100",
  "Chapa Galvalume 0.50 mm - Perfil:  C/105",
  "Chapa Galvalume 0.50 mm - Perfil:  C/110",
  "Chapa Galvalume 0.50 mm - Perfil:  C/115",
  "Chapa Galvalume 0.50 mm - Perfil:  C/120",
  "Chapa Galvalume 0.50 mm - Perfil:  C/75",
  "Chapa Galvalume 0.50 mm - Perfil:  C/80",
  "Chapa Galvalume 0.50 mm - Perfil:  C/85",
  "Chapa Galvalume 0.50 mm - Perfil:  C/90",
  "Chapa Galvalume 0.50 mm - Perfil:  C/95",
  "Chapa Galvalume 0.50 mm - Perfil: C/40",
  "Chapa Galvalume 0.50 mm - Perfil: C/45",
  "Chapa Galvalume 0.50 mm - Perfil: C/50",
  "Chapa Galvalume 0.50 mm - Perfil: C/55",
  "Chapa Galvalume 0.50 mm - Perfil: C/60",
  "Chapa Galvalume 0.50 mm - Perfil: C/65",
  "Chapa Galvalume 0.50 mm - Perfil: C/70",
  "Churrasqueira",
  "Coifa de Cozinha chapa galvalume 0.43 modelo AX 69",
  "Condutor Galvalume 0.43 mm Perfil: 4PL C/35",
  "Condutor Galvalume 0.43 mm Perfil: 6PL C/50",
  "Instalação de coifa Lanchonete",
  "Manutenção",
  "Mão de Obra",
  "Mexer na madeira e cortar",
  "Mexer na Telha",
  "Passar manta líquida nas paredes",
  "PU Veda Calhas Aluzinco IMP",
  "Reboco de alvenaria",
  "Revisao",
  "Rufo Churrasqueira",
  "Tampar calha de Coxo",
  "Telhas TP Chapa Galvalume 0.43 mm",
  "Telhas TP Chapa Galvalume 0.50 mm",
  "Telhas TP Sanduiche Chapa Galvalume 0.43 mm",
  "TELHAS TRAPÉZIO 0.50 AJF",
];

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
  console.log("Coluna material ampliada para VARCHAR(120).");

  let criados = 0;
  let existentes = 0;

  for (const nome of MATERIAIS) {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT id FROM materiais WHERE material = ? LIMIT 1",
      nome,
    );
    if (Array.isArray(rows) && rows.length > 0) {
      existentes += 1;
      console.log(`Já existe: ${nome}`);
      continue;
    }

    await prisma.$executeRawUnsafe(
      "INSERT INTO materiais (material, valor_custo, valor) VALUES (?, 0, 0)",
      nome,
    );
    criados += 1;
    console.log(`Criado: ${nome}`);
  }

  const total = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS n FROM materiais");
  const count = Array.isArray(total) && total[0] ? Number(total[0].n) : 0;
  console.log(`\nPronto. ${criados} novo(s), ${existentes} já cadastrado(s). Total no banco: ${count}.`);
} catch (err) {
  console.error("ERRO:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
