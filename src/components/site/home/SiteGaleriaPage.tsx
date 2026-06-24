import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AcLoginModal } from "@/components/site/home/AcLoginModal";
import { AcProdGalleryGrid } from "@/components/site/home/AcProdGalleryGrid";
import { AcSiteChat } from "@/components/site/home/AcSiteChat";
import { McSiteFooter } from "@/components/site/home/McSiteFooter";
import { McSiteHeader } from "@/components/site/home/McSiteHeader";
import { HOME_SITE } from "@/data/home-config";
import type { HomeGaleriaItem } from "@/data/home-config";
import { useAcSiteHeader } from "@/hooks/use-ac-site-header";
import { fetchAdminSession } from "@/lib/admin-api";

type Props = {
  galeria: HomeGaleriaItem[];
};

export function SiteGaleriaPage({ galeria }: Props) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingPainel, setCheckingPainel] = useState(false);

  useAcSiteHeader();

  useEffect(() => {
    document.body.classList.add("mc-landing", "ac-landing");
    document.body.dataset.waNumber = HOME_SITE.whatsapp;
    return () => {
      document.body.classList.remove("mc-landing", "ac-landing");
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
      <McSiteHeader loggedIn={loggedIn} checkingPainel={checkingPainel} onOpenPainel={() => void abrirPainel()} />

      <main>
        <section className="mc-section mc-prod-gallery-page">
          <div className="mc-container">
            <header className="mc-prod-gallery-page__head">
              <nav className="mc-prod-gallery-page__crumb" aria-label="Navegação">
                <Link to="/">Início</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">Galeria</span>
              </nav>
              <h1 className="mc-section__title">Trabalhos realizados</h1>
              <p className="mc-prod-gallery-page__lead">
                Confira alguns dos nossos projetos de calhas, rufos e acabamentos.
              </p>
            </header>
            <AcProdGalleryGrid items={galeria} />
          </div>
        </section>
      </main>

      <McSiteFooter />
      <AcSiteChat />
      {!loggedIn ? <AcLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} /> : null}
    </>
  );
}
