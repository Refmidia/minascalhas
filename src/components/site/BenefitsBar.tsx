import { Ruler, Zap, Wrench, MapPin } from "lucide-react";

const items = [
  { icon: Ruler, title: "Sob medida", desc: "Peças fabricadas conforme a necessidade do seu projeto." },
  { icon: Zap, title: "Atendimento rápido", desc: "Resposta ágil e prazos que cabem na sua obra." },
  { icon: Wrench, title: "Instalação especializada", desc: "Equipe qualificada e acabamento profissional." },
  { icon: MapPin, title: "Atendimento regional", desc: "Atendemos toda a região com eficiência e dedicação." },
];

export function BenefitsBar() {
  return (
    <div className="relative -mt-20 lg:-mt-24 z-10 px-6">
      <div className="mx-auto max-w-6xl bg-white rounded-[22px] shadow-xl border-t-4 border-brand-green p-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col gap-3">
            <span className="h-12 w-12 rounded-full bg-brand-green-soft text-brand-green grid place-items-center">
              <Icon size={22} />
            </span>
            <h3 className="font-semibold text-brand-navy">{title}</h3>
            <p className="text-sm text-brand-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
