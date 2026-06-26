import { createFileRoute, notFound } from "@tanstack/react-router";

import { McProdutoGaleriaPage } from "@/components/site/home/McProdutoGaleriaPage";
import { getProdutoGaleriaPublica } from "@/lib/produtos-site.functions";
import { buildPageHead } from "@/lib/seo";

const SITE_HEAD_LINKS = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
  },
  { rel: "stylesheet", href: "/css/home-landing-industrial.css" },
] as const;

export const Route = createFileRoute("/galeria/$slug")({
  loader: async ({ params }) => {
    const produto = await getProdutoGaleriaPublica({ data: params.slug });
    if (!produto) throw notFound();
    return { produto };
  },
  head: ({ loaderData, params }) => {
    const produto = loaderData?.produto;
    const slug = params.slug;
    const capa = produto?.fotos?.[0]?.src;
    const seo = buildPageHead({
      title: `${produto?.nome ?? "Galeria"} — Minas Calhas`,
      description:
        produto?.descricao ||
        `Galeria de fotos de ${produto?.nome ?? "produtos"} — Minas Calhas em Florínea e região.`,
      path: `/galeria/${slug}`,
      image: capa,
      imageAlt: produto?.fotos?.[0]?.legenda || `${produto?.nome ?? "Galeria"} — Minas Calhas`,
    });
    return {
      ...seo,
      links: [...seo.links, ...SITE_HEAD_LINKS],
    };
  },
  component: ProdutoGaleriaRoute,
});

function ProdutoGaleriaRoute() {
  const { produto } = Route.useLoaderData();
  return <McProdutoGaleriaPage produto={produto} />;
}
