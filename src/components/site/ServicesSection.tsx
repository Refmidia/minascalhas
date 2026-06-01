import { ArrowUpRight } from "lucide-react";

import type { ProdutoSiteHome } from "@/types/site";

type ServicesSectionProps = {
  items: ProdutoSiteHome[];
};

export function ServicesSection({ items }: ServicesSectionProps) {
  return (
    <section id="servicos" className="bg-brand-green-mist py-24 lg:py-32 mt-24" aria-labelledby="servicos-title">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center rounded-full border border-brand-green/30 bg-white text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            NOSSOS SERVIÇOS
          </span>
          <h2 id="servicos-title" className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy">
            Soluções completas para seu projeto
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((s) => (
            <article key={s.slug} className="group bg-white rounded-[22px] overflow-hidden shadow-sm hover:shadow-xl border border-brand-border/60 transition">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={s.image}
                  alt={`Serviço de ${s.title.toLowerCase()}`}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="p-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-brand-navy">{s.title}</h3>
                  <p className="mt-2 text-sm text-brand-muted leading-relaxed">{s.description}</p>
                </div>
                <a
                  href="#agendar"
                  aria-label={`Solicitar serviço de ${s.title}`}
                  className="shrink-0 h-10 w-10 rounded-full bg-brand-green hover:bg-brand-green-dark text-white grid place-items-center transition"
                >
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
