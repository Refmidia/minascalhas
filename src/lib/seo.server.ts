import { getPublicSiteOrigin } from "@/data/home-config";
import { getPrisma } from "@/lib/db.server";

const STATIC_GALERIA_SLUGS = ["calhas", "rufos", "pingadeiras", "condutores", "coifas", "caixas"];

type SitemapUrl = {
  loc: string;
  changefreq: "weekly" | "monthly";
  priority: string;
};

export async function listSitemapUrls(): Promise<SitemapUrl[]> {
  const origin = getPublicSiteOrigin();
  const urls: SitemapUrl[] = [
    { loc: `${origin}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${origin}/galeria`, changefreq: "weekly", priority: "0.85" },
  ];

  const slugs = new Set<string>(STATIC_GALERIA_SLUGS);
  try {
    const prisma = await getPrisma();
    const produtos = await prisma.produtoSite.findMany({
      where: { ativo: 1 },
      select: { slug: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
    for (const p of produtos) slugs.add(p.slug);
  } catch {
    /* usa slugs estáticos */
  }

  for (const slug of slugs) {
    urls.push({
      loc: `${origin}/galeria/${slug}`,
      changefreq: "monthly",
      priority: "0.75",
    });
  }

  return urls;
}

export async function buildSitemapXml(): Promise<string> {
  const urls = await listSitemapUrls();
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobotsTxt(): string {
  const origin = getPublicSiteOrigin();
  return `User-agent: *
Allow: /

Disallow: /painel/
Disallow: /api/
Disallow: /os
Disallow: /nota-entrega

Sitemap: ${origin}/sitemap.xml
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
