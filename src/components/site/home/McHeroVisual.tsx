import { LANDING_HERO, LANDING_HERO_CALLOUTS } from "@/data/home-config";

/** Imagem do hero com chamadas técnicas sobrepostas (linhas SVG). */
export function McHeroVisual() {
  return (
    <div className="mc-hero-visual">
      <img
        src={LANDING_HERO.image}
        alt={LANDING_HERO.imageAlt}
        width={720}
        height={480}
        fetchPriority="high"
      />
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
    </div>
  );
}
