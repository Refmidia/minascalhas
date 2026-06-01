import { Package, Users, Sparkles, HeartHandshake } from "lucide-react";

const items = [
  { icon: Package, title: "Materiais de qualidade", desc: "Utilizamos materiais duráveis e resistentes." },
  { icon: Users, title: "Mão de obra especializada", desc: "Profissionais experientes no compromisso." },
  { icon: Sparkles, title: "Acabamento impecável", desc: "Detalhes que valorizam sua construção." },
  { icon: HeartHandshake, title: "Confiança no atendimento", desc: "Atendimento cuidadoso em cada etapa do serviço." },
];

export function DifferentialsSection() {
  return (
    <section className="bg-brand-green-mist py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-14 items-start">
        <div className="lg:sticky lg:top-28">
          <span className="inline-flex items-center rounded-full border border-brand-green/30 bg-white text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            POR QUE ESCOLHER A ALEX CALHAS?
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy leading-tight">
            Compromisso com qualidade do início ao fim
          </h2>
          <p className="mt-5 text-brand-muted max-w-md">
            Cada projeto é tratado com atenção aos detalhes, do orçamento à instalação final.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-[20px] p-6 shadow-sm border border-brand-border/60">
              <span className="h-12 w-12 rounded-full bg-brand-green-soft text-brand-green grid place-items-center">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-brand-navy">{title}</h3>
              <p className="mt-2 text-sm text-brand-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
