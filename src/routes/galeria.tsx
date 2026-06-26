import { createFileRoute } from "@tanstack/react-router";

import { SiteGaleriaPage } from "@/components/site/home/SiteGaleriaPage";
import { getHomeLandingData } from "@/lib/home-landing.functions";
import { buildPageHead } from "@/lib/seo";

export const Route = createFileRoute("/galeria")({
  loader: async () => ({
    galeria: (await getHomeLandingData()).galeria,
  }),
  head: ({ loaderData }) => {
    const capa = loaderData?.galeria?.[0]?.src;
    const seo = buildPageHead({
      title: "Galeria — Trabalhos realizados | Minas Calhas",
      description:
        "Galeria de trabalhos realizados em calhas, rufos, pingadeiras e acabamentos pela Minas Calhas em Florínea e região.",
      path: "/galeria",
      image: capa,
      imageAlt: loaderData?.galeria?.[0]?.legenda || "Trabalhos realizados — Minas Calhas",
    });
    return {
      ...seo,
      links: [
        ...seo.links,
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
      ],
    };
  },
  component: GaleriaRoute,
});

function GaleriaRoute() {
  const { galeria } = Route.useLoaderData();
  return <SiteGaleriaPage galeria={galeria} />;
}
