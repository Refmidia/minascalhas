import { useState } from "react";

import { AcProdGalleryLightbox } from "@/components/site/home/AcProdGalleryLightbox";
import type { HomeGaleriaItem } from "@/data/home-config";

type Props = {
  items: HomeGaleriaItem[];
};

export function AcProdGalleryGrid({ items }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="ac-prod-gallery__empty">
        <i className="bi bi-images" aria-hidden="true" />
        <p>Nenhuma foto cadastrada ainda.</p>
      </div>
    );
  }

  return (
    <>
      <div className="ac-prod-gallery__grid">
        {items.map((item, i) => {
          const legenda = item.legenda.trim();
          const alt = legenda || "Trabalho Minas Calhas";
          return (
            <figure key={`${item.src}-${i}`} className="ac-prod-gallery__item">
              <button
                type="button"
                className="ac-prod-gallery__open"
                aria-label={`Ampliar: ${legenda || "Foto"}`}
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={item.src}
                  alt={alt}
                  loading={i < 8 ? "eager" : "lazy"}
                  width={148}
                  height={185}
                />
                <span className="ac-prod-gallery__zoom" aria-hidden="true">
                  <i className="bi bi-zoom-in" />
                </span>
              </button>
              {legenda ? <figcaption>{legenda}</figcaption> : null}
            </figure>
          );
        })}
      </div>
      <AcProdGalleryLightbox
        items={items}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
