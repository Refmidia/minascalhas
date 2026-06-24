import { Link, useRouterState } from "@tanstack/react-router";

import { HOME_SITE, LANDING_NAV } from "@/data/home-config";

type Props = {
  loggedIn: boolean;
  checkingPainel: boolean;
  onOpenPainel: () => void;
};

function resolveNavHref(href: string, onHome: boolean): string {
  if (href.startsWith("#")) return onHome ? href : `/${href}`;
  return href;
}

function isNavActive(href: string, pathname: string, onHome: boolean): boolean {
  if (href === "/galeria") return pathname === "/galeria" || pathname.startsWith("/galeria/");
  if (href === "#inicio") return onHome;
  return false;
}

export function McSiteHeader({ loggedIn, checkingPainel, onOpenPainel }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onHome = pathname === "/";
  const agendarHref = onHome ? "#agendar" : "/#agendar";

  return (
    <header className="mc-header" id="ac-header">
      <div className="mc-header__backdrop" id="ac-nav-backdrop" aria-hidden="true" />

      <div className="mc-container mc-header__inner">
        {onHome ? (
          <a href="#inicio" className="mc-header__logo" aria-label="Minas Calhas — início">
            <img
              src={HOME_SITE.img.logoHeader}
              width={130}
              height={44}
              alt="Minas Calhas"
              className="mc-header__logo-img"
            />
          </a>
        ) : (
          <Link to="/" className="mc-header__logo" aria-label="Minas Calhas — início">
            <img
              src={HOME_SITE.img.logoHeader}
              width={130}
              height={44}
              alt="Minas Calhas"
              className="mc-header__logo-img"
            />
          </Link>
        )}

        <button
          type="button"
          className="mc-header__toggle"
          id="ac-nav-toggle"
          aria-expanded="false"
          aria-controls="ac-nav"
          aria-label="Abrir menu"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className="mc-header__nav" id="ac-nav" aria-label="Principal">
          <ul className="mc-header__menu">
            {LANDING_NAV.map((item) => {
              const href = resolveNavHref(item.href, onHome);
              const active = isNavActive(item.href, pathname, onHome);

              return (
                <li key={item.href}>
                  {item.href.startsWith("/") ? (
                    <Link to={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
                      {item.label}
                    </Link>
                  ) : (
                    <a href={href} className={active ? "is-active" : undefined}>
                      {item.label}
                    </a>
                  )}
                </li>
              );
            })}
            <li className="mc-header__menu-login mc-header__menu-login--mobile">
              {loggedIn ? (
                <a href="/painel">Painel</a>
              ) : (
                <button
                  type="button"
                  className="mc-header__login-btn"
                  id="ac-open-login"
                  aria-haspopup="dialog"
                  disabled={checkingPainel}
                  onClick={onOpenPainel}
                >
                  {checkingPainel ? "…" : "Login"}
                </button>
              )}
            </li>
          </ul>
        </nav>

        <div className="mc-header__aside">
          <div className="mc-header__login-desktop">
            {loggedIn ? (
              <a href="/painel" className="mc-header__login-btn">
                Painel
              </a>
            ) : (
              <button
                type="button"
                className="mc-header__login-btn"
                aria-haspopup="dialog"
                disabled={checkingPainel}
                onClick={onOpenPainel}
              >
                {checkingPainel ? "…" : "Login"}
              </button>
            )}
          </div>
          <a href={agendarHref} className="mc-btn mc-btn--primary mc-header__cta">
            <i className="bi bi-calendar-check" aria-hidden="true" /> Agendar visita
          </a>
        </div>
      </div>
    </header>
  );
}
