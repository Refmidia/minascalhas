import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Header } from "@/components/site/Header";
import { getProdutosSiteHome } from "@/lib/produtos-site.functions";
import { Hero } from "@/components/site/Hero";
import { BenefitsBar } from "@/components/site/BenefitsBar";
import { ServicesSection } from "@/components/site/ServicesSection";
import { GallerySection } from "@/components/site/GallerySection";
import { DifferentialsSection } from "@/components/site/DifferentialsSection";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { ContactSection } from "@/components/site/ContactSection";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

type IndexSearch = {
  painel?: "login";
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    painel: search.painel === "login" ? "login" : undefined,
  }),
  loader: async () => ({
    servicos: await getProdutosSiteHome(),
  }),
  head: () => ({
    meta: [
      { title: "Alex Calhas — Calhas, rufos e pingadeiras com instalação profissional" },
      { name: "description", content: "Soluções sob medida em calhas, rufos, pingadeiras, condutores, coifas e caixas térmicas. Atendimento rápido e acabamento impecável." },
      { property: "og:title", content: "Alex Calhas — Qualidade que protege" },
      { property: "og:description", content: "Calhas, rufos e pingadeiras com instalação profissional." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  const { servicos } = Route.useLoaderData();
  const { painel } = Route.useSearch();
  const [loginOpen, setLoginOpen] = useState(painel === "login");

  useEffect(() => {
    if (painel === "login") setLoginOpen(true);
  }, [painel]);

  return (
    <div className="min-h-screen bg-white">
      <Header painelLoginOpen={loginOpen} onPainelLoginOpenChange={setLoginOpen} />
      <main>
        <Hero />
        <BenefitsBar />
        <ServicesSection items={servicos} />
        <GallerySection />
        <DifferentialsSection />
        <AppointmentForm />
        <ContactSection />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
