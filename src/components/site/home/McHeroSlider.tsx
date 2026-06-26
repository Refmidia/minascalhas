import { useEffect, useMemo, useState } from "react";

import { LANDING_HERO, type HomeSlide } from "@/data/home-config";

const INTERVAL_MS = 3000;

type Props = {
  slides: HomeSlide[];
};

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
    </div>
  );
}
