import calhas from "@/assets/service-calhas.jpg";
import rufos from "@/assets/service-rufos.jpg";
import condutores from "@/assets/service-condutores.jpg";
import pingadeiras from "@/assets/service-pingadeiras.jpg";

const items = [
  { img: calhas, label: "Calhas" },
  { img: condutores, label: "Calhas" },
  { img: rufos, label: "Rufos" },
  { img: pingadeiras, label: "Rufos" },
];

export function GallerySection() {
  return (
    <section id="galeria" className="bg-brand-navy py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center rounded-full bg-brand-green/15 text-brand-green text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5">
            TRABALHOS REALIZADOS
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Qualidade que você vê, resultado que você sente
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it, i) => (
            <figure key={i} className="group">
              <div className="aspect-[4/5] overflow-hidden rounded-[20px]">
                <img src={it.img} alt={it.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <figcaption className="mt-3 text-center text-white/90 text-sm font-medium">{it.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
