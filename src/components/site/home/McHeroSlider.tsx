import { useCallback, useEffect, useMemo, useState } from "react";

import { LANDING_HERO, LANDING_HERO_CALLOUTS, type HomeSlide } from "@/data/home-config";

const INTERVAL_MS = 3000;

type Props = {
  slides: HomeSlide[];
};

function HeroCallouts() {
  return (
    <>
      <svg className="mc-hero-visual__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {LANDING_HERO_CALLOUTS.map((c) => (
          <line
            key={`line-${c.key}`}
            x1={c.labelX}
            y1={c.labelY}
            x2={c.dotX}
            y2={c.dotY}
            className="mc-hero-visual__line"
          />
        ))}
        {LANDING_HERO_CALLOUTS.map((c) => (
          <circle key={`dot-${c.key}`} cx={c.dotX} cy={c.dotY} r="0.55" className="mc-hero-visual__dot" />
        ))}
      </svg>
      {LANDING_HERO_CALLOUTS.map((c) => (
        <div
          key={c.key}
          className={`mc-hero-visual__label mc-hero-visual__label--${c.align}`}
          style={{ left: `${c.labelX}%`, top: `${c.labelY}%` }}
        >
          <strong>{c.label}</strong>
          <span>{c.text}</span>
        </div>
      ))}
    </>
  );
}

export function McHeroSlider({ slides }: Props) {
  const items = useMemo(
    () =>
      slides.length > 0
        ? slides
        : [{ src: LANDING_HERO.image, alt: LANDING_HERO.imageAlt }],
    [slides],
  );

  const [active, setActive] = useState(0);
  const total = items.length;
  const slideKey = items.map((s) => s.src).join("|");

  const goTo = useCallback(
    (index: number) => {
      if (total <= 0) return;
      setActive((index + total) % total);
    },
    [total],
  );

  useEffect(() => {
    setActive(0);
  }, [slideKey]);

  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(() => {
      setActive((c) => (c + 1) % total);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [total, slideKey]);

  return (
    <div className="mc-hero-slider" id="ac-hero-slider">
      <div className="mc-hero-slider__viewport">
        {items.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            className={`mc-hero-slider__slide${i === active ? " is-active" : ""}`}
            aria-hidden={i !== active}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width={720}
              height={960}
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>

      <HeroCallouts />

      {total > 1 ? (
        <>
          <button
            type="button"
            className="mc-hero-slider__arrow mc-hero-slider__arrow--prev"
            id="ac-hero-prev"
            aria-label="Foto anterior"
            onClick={() => goTo(active - 1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="mc-hero-slider__arrow mc-hero-slider__arrow--next"
            id="ac-hero-next"
            aria-label="Próxima foto"
            onClick={() => goTo(active + 1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
          <div className="mc-hero-slider__dots" role="tablist" aria-label="Fotos do hero">
            {items.map((slide, i) => (
              <button
                key={`dot-${slide.src}-${i}`}
                type="button"
                role="tab"
                className={`mc-hero-slider__dot${i === active ? " is-active" : ""}`}
                aria-label={`Foto ${i + 1} de ${total}`}
                aria-selected={i === active}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
