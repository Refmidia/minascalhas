import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env"), override: true });

const PRODUTOS_HOME = [
  {
    slug: "calhas",
    nome: "Calha",
    descricao: "Coleta e direciona a água com eficiência.",
    ordem: 1,
  },
  {
    slug: "rufos",
    nome: "Rufos",
    descricao: "Vedação e acabamento em telhados.",
    ordem: 2,
  },
  {
    slug: "pingadeiras",
    nome: "Pingadeiras",
    descricao: "Proteção para muros e paredes.",
    ordem: 3,
  },
  {
    slug: "coifas",
    nome: "Coifas e chaminés",
    descricao: "Saída de ar com proteção e acabamento.",
    ordem: 4,
  },
  {
    slug: "condutores",
    nome: "Calhas e condutos",
    descricao: "Solução ideal para indústrias e grandes estruturas.",
    ordem: 5,
  },
];

const user = process.env.DB_USER;
const pass = process.env.DB_PASSWORD;
const db = process.env.DB_NAME;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT || "3306";

const url = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${encodeURIComponent(db)}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  await prisma.$connect();

  for (const item of PRODUTOS_HOME) {
    const existing = await prisma.produtoSite.findFirst({ where: { slug: item.slug } });

    if (existing) {
      await prisma.produtoSite.update({
        where: { id: existing.id },
        data: {
          nome: item.nome,
          descricao: item.descricao,
          ordem: item.ordem,
          ativo: 1,
        },
      });
      console.log(`Atualizado: ${item.slug} → ${item.nome}`);
      continue;
    }

    await prisma.produtoSite.create({
      data: {
        slug: item.slug,
        nome: item.nome,
        descricao: item.descricao,
        ordem: item.ordem,
        ativo: 1,
      },
    });
    console.log(`Criado: ${item.slug} → ${item.nome}`);
  }

  const total = await prisma.produtoSite.count({ where: { ativo: 1 } });
  console.log(`\nPronto. ${total} produto(s) ativo(s) no catálogo.`);
} catch (err) {
  console.error("ERRO:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
