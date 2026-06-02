import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AcLoginModal } from "@/components/site/home/AcLoginModal";
import { AcProdGalleryGrid } from "@/components/site/home/AcProdGalleryGrid";
import { AcSiteChat } from "@/components/site/home/AcSiteChat";
import { HOME_SITE, waUrl } from "@/data/home-config";
import type { HomeGaleriaItem } from "@/data/home-config";
import { useAcSiteHeader } from "@/hooks/use-ac-site-header";
import { fetchAdminSession } from "@/lib/admin-api";

type Props = {
  galeria: HomeGaleriaItem[];
};

export function SiteGaleriaPage({ galeria }: Props) {
  useAcSiteHeader();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingPainel, setCheckingPainel] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    document.body.classList.add("ac-landing", "ac-produto-page");
    document.body.dataset.waNumber = HOME_SITE.whatsapp;
    return () => {
      document.body.classList.remove("ac-landing", "ac-produto-page");
      delete document.body.dataset.waNumber;
    };
  }, []);

  useEffect(() => {
    void fetchAdminSession()
      .then((s) => setLoggedIn(s.authenticated))
      .catch(() => setLoggedIn(false));
  }, []);

  async function abrirPainel() {
    setCheckingPainel(true);
    try {
      const { authenticated } = await fetchAdminSession();
      if (authenticated) {
        window.location.assign("/painel");
        return;
      }
      setLoginOpen(true);
    } catch {
      setLoginOpen(true);
    } finally {
      setCheckingPainel(false);
    }
  }

  return (
    <>
      <header className="ac-header is-scrolled" id="ac-header">
        <div className="ac-container ac-header__inner">
          <Link to="/" className="ac-header__logo" aria-label="Alex Calhas — início">
            <img
              src={HOME_SITE.img.logoHeader}
              width={150}
              height={52}
              alt="Alex Calhas"
              className="ac-header__logo-img"
            />
          </Link>

          <button
            type="button"
            className="ac-header__toggle"
            id="ac-nav-toggle"
            aria-expanded="false"
            aria-controls="ac-nav"
            aria-label="Abrir menu"
          >
            <span />
            <span />
            <span />
          </button>

          <nav className="ac-header__nav" id="ac-nav" aria-label="Principal">
            <ul className="ac-header__menu">
              <li>
                <a href="/#inicio">Início</a>
              </li>
              <li>
                <a href="/#servicos">Serviços</a>
              </li>
              <li>
                <a href="/#projetos">Projetos</a>
              </li>
              <li>
                <Link to="/galeria" aria-current="page">
                  Galeria
                </Link>
              </li>
              <li>
                <a href="/#contato">Contato</a>
              </li>
            </ul>
            {loggedIn ? (
              <a href="/painel" className="ac-header__login">
                Painel
              </a>
            ) : (
              <button
                type="button"
                className="ac-header__login ac-header__login--btn"
                aria-haspopup="dialog"
                disabled={checkingPainel}
                onClick={() => void abrirPainel()}
              >
                {checkingPainel ? "…" : "Login"}
              </button>
            )}
          </nav>

          <a href="/#contato" className="ac-btn ac-btn--primary ac-header__cta">
            <i className="bi bi-calendar-check" aria-hidden="true" /> Agendar visita
          </a>
        </div>
      </header>

      <main>
        <section className="ac-prod-page">
          <div className="ac-container">
            <header className="ac-prod-page__head">
              <nav className="ac-prod-breadcrumb" aria-label="Navegação">
                <Link to="/">Início</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">Galeria</span>
              </nav>
              <h1 className="ac-prod-page__title">Trabalhos realizados</h1>
              <p className="ac-prod-page__lead">
                Confira alguns dos nossos projetos de calhas, rufos e acabamentos.
              </p>
            </header>
            <AcProdGalleryGrid items={galeria} />
          </div>
        </section>
      </main>

      <footer className="ac-footer">
        <div className="ac-container ac-footer__grid">
          <div className="ac-footer__brand">
            <img
              className="ac-footer__logo"
              src={HOME_SITE.img.logoFooter}
              width={160}
              height={56}
              alt="Alex Calhas"
            />
            <p>Soluções em calhas, rufos e acabamentos com qualidade e confiança.</p>
          </div>
          <div>
            <h3 className="ac-footer__title">Navegação</h3>
            <ul className="ac-footer__links">
              <li>
                <a href="/#inicio">Início</a>
              </li>
              <li>
                <a href="/#servicos">Serviços</a>
              </li>
              <li>
                <a href="/#projetos">Projetos</a>
              </li>
              <li>
                <Link to="/galeria">Galeria</Link>
              </li>
              <li>
                <a href="/#contato">Contato</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="ac-footer__title">Contato</h3>
            <ul className="ac-footer__contact">
              <li>
                <a href={waUrl(HOME_SITE.whatsapp)} target="_blank" rel="noopener noreferrer">
                  {HOME_SITE.telefone1}
                </a>
              </li>
              <li>
                <a href={waUrl(HOME_SITE.whatsappSec)} target="_blank" rel="noopener noreferrer">
                  {HOME_SITE.telefone2}
                </a>
              </li>
              <li>
                <a href={`mailto:${HOME_SITE.email}`}>{HOME_SITE.email}</a>
              </li>
              <li>{HOME_SITE.endereco}</li>
            </ul>
          </div>
        </div>
        <div className="ac-footer__bottom">
          <div className="ac-container ac-footer__bottom-inner">
            <p>&copy; {year} Alex Calhas. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <AcSiteChat />
      {!loggedIn ? <AcLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} /> : null}
    </>
  );
}
