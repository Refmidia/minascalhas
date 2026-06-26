import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HomeLanding } from "@/components/site/home/HomeLanding";
import { SeoJsonLd } from "@/components/site/SeoJsonLd";
import { LANDING_HERO } from "@/data/home-config";
import { getHomeLandingData } from "@/lib/home-landing.functions";
import { buildPageHead, localBusinessJsonLd, websiteJsonLd } from "@/lib/seo";

type IndexSearch = {
  painel?: "login";
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    painel: search.painel === "login" ? "login" : undefined,
  }),
  loader: async () => ({
    home: await getHomeLandingData(),
  }),
  head: () => {
    const seo = buildPageHead({
      title: "Minas Calhas — Calhas sob medida da infiltração ao acabamento",
      description:
        "Projeto, fabricação e instalação de calhas, rufos, pingadeiras e condutores em Florínea e região. Acabamento premium e atendimento rápido.",
      path: "/",
      image: LANDING_HERO.image,
      imageAlt: LANDING_HERO.imageAlt,
    });
    return {
      ...seo,
      meta: [
        ...seo.meta,
        { property: "og:title", content: "Minas Calhas — Proteção e acabamento premium" },
      ],
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
  component: Index,
});

function Index() {
  const { home } = Route.useLoaderData();
  const { painel } = Route.useSearch();
  const [loginOpen, setLoginOpen] = useState(painel === "login");

  useEffect(() => {
    if (painel === "login") setLoginOpen(true);
  }, [painel]);

  return (
    <>
      <SeoJsonLd data={[websiteJsonLd(), localBusinessJsonLd()]} />
      <HomeLanding
        data={home}
        painelLoginOpen={loginOpen}
        onPainelLoginOpenChange={setLoginOpen}
      />
    </>
  );
}
