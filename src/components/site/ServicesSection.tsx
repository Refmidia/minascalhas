import { ArrowUpRight } from "lucide-react";
import calhas from "@/assets/service-calhas.jpg";
import rufos from "@/assets/service-rufos.jpg";
import pingadeiras from "@/assets/service-pingadeiras.jpg";
import condutores from "@/assets/service-condutores.jpg";
import coifas from "@/assets/service-coifas.jpg";
import caixas from "@/assets/service-caixas.jpg";

const services = [
  { img: calhas, title: "Calhas", desc: "Proteção eficiente contra infiltrações e desvio de água da chuva." },
  { img: rufos, title: "Rufos", desc: "Vedação e acabamento que garantem durabilidade e segurança." },
  { img: pingadeiras, title: "Pingadeiras", desc: "Acabamento que evita manchas e infiltrações em paredes e fachadas." },
  { img: condutores, title: "Condutores", desc: "Escoamento de água com segurança e alto desempenho." },
  { img: coifas, title: "Coifas", desc: "Ventilação e proteção para churrasqueiras e sistemas de exaustão." },
  { img: caixas, title: "Caixas térmicas", desc: "Soluções térmicas sob medida para diversos segmentos." },
];

export function ServicesSection() {
  return (
    <section id="servicos" className="bg-brand-green-mist py-24 lg:py-32 mt-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center rounded-full border border-brand-green/30 bg-white text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            NOSSOS SERVIÇOS
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy">
            Soluções completas para seu projeto
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <article key={s.title} className="group bg-white rounded-[22px] overflow-hidden shadow-sm hover:shadow-xl border border-brand-border/60 transition">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={s.img} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <div className="p-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-brand-navy">{s.title}</h3>
                  <p className="mt-2 text-sm text-brand-muted leading-relaxed">{s.desc}</p>
                </div>
                <a href="#agendar" aria-label={`Solicitar ${s.title}`} className="shrink-0 h-10 w-10 rounded-full bg-brand-green hover:bg-brand-green-dark text-white grid place-items-center transition">
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
