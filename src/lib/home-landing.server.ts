import { existsSync } from "node:fs";
import path from "node:path";

import { HOME_SITE, landingServicesFallback, siteAsset, type HomeGaleriaItem, type HomeLandingData, type HomeServico, type HomeSlide } from "@/data/home-config";
import { getPrisma } from "@/lib/db.server";
import { resolveProdutoImagemUrl } from "@/lib/produtos-site.server";
import { resolverUrlProdutoFoto } from "@/lib/produto-foto-db.server";

function staticLanding(): HomeLandingData {
  const servicos = landingServicesFallback().map((s) => ({
    ...s,
    img: siteAsset(s.img),
  }));
  const heroSlides = HOME_SITE.img.heroSlides.map((s) => ({
    src: siteAsset(s.src),
    alt: s.alt,
  }));
  const galeria = HOME_SITE.img.galeria.map((g) => ({
    src: siteAsset(g.src),
    legenda: g.legenda,
  }));
  return { servicos, heroSlides, galeria };
}

function resolvePublicUrl(rel: string): string {
  const local = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  if (existsSync(local)) return rel;
  const base = HOME_SITE.mediaBaseUrl;
  const remote = rel.startsWith("/") ? rel : `/${rel}`;
  return `${base}${remote}`;
}

async function buildFromDb(): Promise<HomeLandingData | null> {
  const prisma = await getPrisma();
  const produtos = await prisma.produtoSite.findMany({
    where: { ativo: 1 },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  if (produtos.length === 0) return null;

  const servicos: HomeServico[] = [];
  const galeria: HomeGaleriaItem[] = [];
  const heroSlides: HomeSlide[] = [];

  const porProduto = await Promise.all(
    produtos.map(async (p) => {
      const [img, fotos] = await Promise.all([
        resolveProdutoImagemUrl(prisma, p.id, p.slug),
        prisma.produtoFoto.findMany({
          where: { produtoId: p.id },
          orderBy: [{ ehCapa: "desc" }, { ordem: "asc" }, { id: "asc" }],
        }),
      ]);

      const servico: HomeServico = {
        slug: p.slug,
        titulo: p.nome,
        texto: p.descricao?.trim() || "",
        img,
      };

      const itensGaleria: HomeGaleriaItem[] = [];
      const slides: HomeSlide[] = [];

      if (fotos.length === 0) {
        if (img) itensGaleria.push({ src: img, legenda: p.nome });
        return { servico, itensGaleria, slides };
      }

      for (const f of fotos) {
        if (!f.arquivo) continue;
        const item = {
          src: await resolverUrlProdutoFoto(f.id, f.arquivo),
          legenda: f.legenda?.trim() || p.nome,
        };
        itensGaleria.push(item);
        slides.push({ src: item.src, alt: item.legenda || p.nome });
      }
      if (fotos.length > 0 && itensGaleria.length === 0 && img) {
        itensGaleria.push({ src: img, legenda: p.nome });
      }
      return { servico, itensGaleria, slides };
    }),
  );

  for (const bloco of porProduto) {
    servicos.push(bloco.servico);
    galeria.push(...bloco.itensGaleria);
    heroSlides.push(...bloco.slides);
  }

  const heroSlidesFinal: HomeSlide[] =
    heroSlides.length > 0 ? heroSlides : staticLanding().heroSlides;

  return { servicos, galeria, heroSlides: heroSlidesFinal };
}

export async function loadHomeLandingData(): Promise<HomeLandingData> {
  try {
    const fromDb = await buildFromDb();
    if (fromDb) return fromDb;
  } catch (err) {
    console.error("[loadHomeLandingData]", err);
  }
  return staticLanding();
}
