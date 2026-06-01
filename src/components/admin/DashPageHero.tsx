import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  iconClass?: string;
  /** Classe de acento (ex.: visitas → dash-page-header__icon--visitas) */
  accent?: string;
  /** `form` = página Agendar (hero + CTA como no PHP, sem dash-page-header) */
  layout?: "header" | "form";
  headerMeta?: ReactNode;
  cta?: ReactNode;
  /** @deprecated use cta */
  showNovaVisita?: boolean;
};

/** Cabeçalho hero igual ao PHP renderDashPageHero(). */
export function DashPageHero({
  title,
  subtitle,
  iconClass = "bi-grid",
  accent,
  layout = "header",
  headerMeta,
  cta,
  showNovaVisita,
}: Props) {
  const actions = cta ?? (showNovaVisita === false ? null : <NovaVisitaCta />);
  const iconClasses = [
    "dash-form-page__hero-icon",
    layout === "header" ? "dash-page-header__icon" : "",
    accent ? `dash-page-header__icon--${accent}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (layout === "form") {
    return (
      <header className="dash-form-page__hero">
        <div className="dash-form-page__hero-text">
          <span className={iconClasses} aria-hidden="true">
            <i className={`bi ${iconClass}`} />
          </span>
          <div>
            <h1 className="dash-form-page__title mb-0">{title}</h1>
            {subtitle ? <p className="dash-form-page__desc mb-0">{subtitle}</p> : null}
          </div>
        </div>
        {actions}
      </header>
    );
  }

  return (
    <header className="dash-form-page__hero dash-page-header">
      <div className="dash-form-page__hero-text">
        <span className={iconClasses} aria-hidden="true">
          <i className={`bi ${iconClass}`} />
        </span>
        <div>
          <h1 className="dash-form-page__title mb-0">{title}</h1>
          {subtitle ? <p className="dash-form-page__desc mb-0">{subtitle}</p> : null}
        </div>
      </div>
      {headerMeta || actions ? (
        <div className="dash-page-header__actions">
          {headerMeta}
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function NovaVisitaCta() {
  return (
    <Link to="/painel/agendar" className="dash-form-page__cta">
      <i className="bi bi-plus-lg" aria-hidden="true" />
      <span>Nova visita</span>
    </Link>
  );
}
