import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HomeLanding } from "@/components/site/home/HomeLanding";
import { getHomeLandingData } from "@/lib/home-landing.functions";

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
  head: () => ({
    meta: [
      { title: "Minas Calhas — Calhas sob medida da infiltração ao acabamento" },
      {
        name: "description",
        content:
          "Projeto, fabricação e instalação de calhas, rufos, pingadeiras e condutores em Florínea e região. Acabamento premium e atendimento rápido.",
      },
      { property: "og:title", content: "Minas Calhas — Proteção e acabamento premium" },
      {
        property: "og:description",
        content: "Calhas sob medida para proteger sua obra da infiltração ao acabamento.",
      },
    ],
    links: [
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
  }),
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
    <HomeLanding
      data={home}
      painelLoginOpen={loginOpen}
      onPainelLoginOpenChange={setLoginOpen}
    />
  );
}
