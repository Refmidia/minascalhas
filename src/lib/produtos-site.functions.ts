import { createServerFn } from "@tanstack/react-start";

import { SERVICES } from "@/data/site";
import { loadProdutoGaleriaPublica, listProdutosSitePublicos } from "@/lib/produtos-site.server";
import type { ProdutoSiteHome } from "@/types/site";

function staticHomeServices(): ProdutoSiteHome[] {
  return SERVICES.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    image: s.image,
  }));
}

export const getProdutosSiteHome = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const items = await listProdutosSitePublicos();
    if (items.length > 0) return items;
  } catch (err) {
    console.error("[getProdutosSiteHome]", err);
  }
  return staticHomeServices();
});

export const getProdutoGaleriaPublica = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug.trim().toLowerCase())
  .handler(async ({ data: slug }) => loadProdutoGaleriaPublica(slug));
