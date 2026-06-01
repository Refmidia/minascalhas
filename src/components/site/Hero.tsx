import { ShieldCheck, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-roof.jpg";

export function Hero() {
  return (
    <section id="inicio" className="relative pt-[72px] bg-brand-green-mist overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-16 lg:pt-24 pb-32 lg:pb-40 grid lg:grid-cols-2 gap-12 items-center">
        <div className="max-w-xl">
          <span className="inline-flex items-center rounded-full border border-brand-green/30 bg-white text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            QUALIDADE QUE PROTEGE
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-navy leading-[1.05]">
            Calhas, rufos e pingadeiras com{" "}
            <span className="text-brand-green">instalação profissional</span>
          </h1>
          <p className="mt-6 text-lg text-brand-muted leading-relaxed">
            Soluções sob medida para proteger sua obra com eficiência, durabilidade e um acabamento impecável.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#agendar" className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-dark text-white font-semibold px-6 py-3.5 transition shadow-sm">
              Agendar visita <ArrowRight size={16} />
            </a>
            <a href="#servicos" className="inline-flex items-center rounded-full bg-white border border-brand-green/40 text-brand-green hover:bg-brand-green-soft font-semibold px-6 py-3.5 transition">
              Ver serviços
            </a>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-brand-muted">
            <ShieldCheck size={18} className="text-brand-green" />
            Atendimento rápido e garantia de qualidade
          </div>
        </div>

        <div className="relative">
          <div
            className="aspect-[4/5] lg:aspect-[5/6] w-full overflow-hidden bg-brand-green-soft shadow-2xl"
            style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)", borderRadius: "22px" }}
          >
            <img src={heroImg} alt="Calhas instaladas em telhado residencial" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden md:block h-24 w-24 rounded-2xl bg-brand-green/10 border border-brand-green/20" />
        </div>
      </div>
    </section>
  );
}
