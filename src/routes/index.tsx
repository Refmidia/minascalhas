import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { BenefitsBar } from "@/components/site/BenefitsBar";
import { ServicesSection } from "@/components/site/ServicesSection";
import { GallerySection } from "@/components/site/GallerySection";
import { DifferentialsSection } from "@/components/site/DifferentialsSection";
import { AppointmentForm } from "@/components/site/AppointmentForm";
import { ContactSection } from "@/components/site/ContactSection";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export const Route = createFileRoute("/")({
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
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <BenefitsBar />
        <ServicesSection />
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
