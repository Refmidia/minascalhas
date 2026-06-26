import { existsSync } from "node:fs";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";

import type { HomeGaleriaItem } from "@/data/home-config";
import { getPrisma } from "@/lib/db.server";
import {
  ocultarImagemPadraoProduto,
  ocultarImagemPadraoTodos,
  produtoSemImagemPadrao,
} from "@/lib/produto-imagem-padrao.server";
import { fotoPublicUrl, produtosUploadDir } from "@/lib/produtos-upload.server";
import type { ProdutoGaleriaPublica, ProdutoSiteHome } from "@/types/site";

export type { ProdutoGaleriaPublica, ProdutoSiteHome };

const SLUG_ALIASES: Record<string, string> = {
  "caixas-termicas": "caixas",
  "caixa-termica": "caixas",
  "caixas-termica": "caixas",
  condutos: "condutores",
  condutor: "condutores",
  condutores: "condutores",
};

/** Caminhos estáticos do site (mesmos slugs do catálogo). */
const SLUG_STATIC_IMG: Record<string, string> = {
  calhas: "/images/galeria/calhas.jpg",
  rufos: "/images/galeria/rufos.jpg",
  pingadeiras: "/images/galeria/pingadeiras.jpg",
  condutores: "/images/galeria/condutores.jpg",
  coifas: "/images/galeria/coifas.jpg",
  caixas: "/images/galeria/caixas.jpg",
};

function slugImagemPadrao(slug: string): string {
  const s = slug.trim().toLowerCase();
  return SLUG_ALIASES[s] ?? s;
}

function staticFallback(slug: string): string {
  const key = slugImagemPadrao(slug);
  const rel = SLUG_STATIC_IMG[key];
  if (!rel) return "";
  const local = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  if (existsSync(local)) return rel;
  const base = process.env.PRODUTOS_FALLBACK_BASE?.replace(/\/$/, "") ?? "";
  if (base) return `${base}${rel}`;
  return rel;
}

/** Imagem padrão do catálogo quando não há foto no painel. */
export function staticProdutoImageUrl(slug: string): string {
  return staticFallback(slug);
}

export async function resolveProdutoImagemUrl(
  prisma: PrismaClient,
  produtoId: number,
  slug: string,
): Promise<string> {
  const fotos = await prisma.produtoFoto.findMany({
    where: { produtoId },
    orderBy: [{ ehCapa: "desc" }, { ordem: "asc" }, { id: "asc" }],
    take: 3,
  });

  const capa = fotos.find((f) => f.ehCapa === 1) ?? fotos[0];
  if (capa?.arquivo) {
    const local = path.join(produtosUploadDir(), capa.arquivo);
    if (existsSync(local)) return fotoPublicUrl(capa.arquivo);
    return fotoPublicUrl(capa.arquivo);
  }

  if (await produtoSemImagemPadrao(prisma, produtoId)) return "";

  return staticFallback(slug);
}

/** Imagem padrão do catálogo ainda visível no painel (sem fotos enviadas). */
export async function resolveImagemPadraoAdmin(
  prisma: PrismaClient,
  produtoId: number,
  slug: string,
): Promise<{ url: string; legenda: string } | null> {
  const temFoto = await prisma.produtoFoto.findFirst({
    where: { produtoId, arquivo: { not: "" } },
    select: { id: true },
  });
  if (temFoto) return null;

  if (await produtoSemImagemPadrao(prisma, produtoId)) return null;

  const url = staticFallback(slug);
  if (!url) return null;

  return { url, legenda: "Imagem padrão do catálogo" };
}

function slugBuscaCandidatos(slug: string): string[] {
  const s = slug.trim().toLowerCase();
  const canon = SLUG_ALIASES[s] ?? s;
  const set = new Set([s, canon]);
  if (canon === "condutores" || s === "condutos") {
    set.add("condutos");
    set.add("condutores");
  }
  return [...set];
}

/** Galeria pública de um produto (fotos do painel). */
export async function loadProdutoGaleriaPublica(slug: string): Promise<ProdutoGaleriaPublica | null> {
  const prisma = await getPrisma();
  const row = await prisma.produtoSite.findFirst({
    where: {
      slug: { in: slugBuscaCandidatos(slug) },
      ativo: 1,
    },
    include: {
      fotos: {
        orderBy: [{ ehCapa: "desc" }, { ordem: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!row) return null;

  const fotos: HomeGaleriaItem[] = [];
  for (const f of row.fotos) {
    if (!f.arquivo) continue;
    fotos.push({
      src: fotoPublicUrl(f.arquivo),
      legenda: f.legenda?.trim() || row.nome,
    });
  }

  if (fotos.length === 0) {
    if (await produtoSemImagemPadrao(prisma, row.id)) {
      return {
        slug: row.slug,
        nome: row.nome,
        descricao: row.descricao?.trim() || "",
        fotos: [],
      };
    }
    const capa = await resolveProdutoImagemUrl(prisma, row.id, row.slug);
    if (capa) fotos.push({ src: capa, legenda: row.nome });
  }

  return {
    slug: row.slug,
    nome: row.nome,
    descricao: row.descricao?.trim() || "",
    fotos,
  };
}

/** Produtos ativos do painel para a grade "Soluções completas" na home. */
export async function listProdutosSitePublicos(): Promise<ProdutoSiteHome[]> {
  const prisma = await getPrisma();
  const rows = await prisma.produtoSite.findMany({
    where: { ativo: 1 },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  return Promise.all(
    rows.map(async (r) => ({
      slug: r.slug,
      title: r.nome,
      description: r.descricao?.trim() || "",
      image: await resolveProdutoImagemUrl(prisma, r.id, r.slug),
    })),
  );
}
