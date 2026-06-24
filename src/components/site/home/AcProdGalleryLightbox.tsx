import { useCallback, useEffect, useState } from "react";

import type { HomeGaleriaItem } from "@/data/home-config";

type Props = {
  items: HomeGaleriaItem[];
  openIndex: number | null;
  onClose: () => void;
};

export function AcProdGalleryLightbox({ items, openIndex, onClose }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (openIndex !== null) setIndex(openIndex);
  }, [openIndex]);

  const mostrar = useCallback(
    (i: number) => {
      if (!items.length) return;
      setIndex((i + items.length) % items.length);
    },
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (items.length < 2) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        mostrar(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        mostrar(index + 1);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [openIndex, index, items.length, mostrar, onClose]);

  if (openIndex === null || !items.length) return null;

  const item = items[index];
  const multi = items.length > 1;

  return (
    <div
      className="ac-prod-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar foto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ac-prod-lightbox__frame">
        <button type="button" className="ac-prod-lightbox__close" aria-label="Fechar" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        {multi ? (
          <>
            <button
              type="button"
              className="ac-prod-lightbox__nav ac-prod-lightbox__nav--prev"
              aria-label="Foto anterior"
              onClick={(e) => {
                e.stopPropagation();
                mostrar(index - 1);
              }}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ac-prod-lightbox__nav ac-prod-lightbox__nav--next"
              aria-label="Próxima foto"
              onClick={(e) => {
                e.stopPropagation();
                mostrar(index + 1);
              }}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <figure className="ac-prod-lightbox__figure">
          <img src={item.src} alt={item.legenda || "Trabalho Minas Calhas"} />
          <figcaption>{item.legenda}</figcaption>
        </figure>
      </div>
    </div>
  );
}
