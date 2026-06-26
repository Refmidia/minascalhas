import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AcAgendarForm } from "@/components/site/home/AcAgendarForm";
import { AcLoginModal } from "@/components/site/home/AcLoginModal";
import { AcSiteChat } from "@/components/site/home/AcSiteChat";
import { McHeroSlider } from "@/components/site/home/McHeroSlider";
import { McTechnicalDiagram } from "@/components/site/home/McTechnicalDiagram";
import { McSiteFooter } from "@/components/site/home/McSiteFooter";
import { McSiteHeader } from "@/components/site/home/McSiteHeader";
import {
  HOME_SITE,
  LANDING_HERO,
  LANDING_HERO_PERKS,
  LANDING_NEEDS,
  LANDING_TECH,
  landingServicesFallback,
  serviceIconForSlug,
  waUrl,
} from "@/data/home-config";
import type { HomeLandingData } from "@/data/home-config";
import { useAcSiteHeader } from "@/hooks/use-ac-site-header";
import { fetchAdminSession } from "@/lib/admin-api";

type Props = {
  data: HomeLandingData;
  painelLoginOpen?: boolean;
  onPainelLoginOpenChange?: (open: boolean) => void;
};

export function HomeLanding({ data, painelLoginOpen, onPainelLoginOpenChange }: Props) {
  const navigate = useNavigate();
  const [localLogin, setLocalLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingPainel, setCheckingPainel] = useState(false);
  const servicos = data.servicos.length > 0 ? data.servicos : landingServicesFallback();

  const loginOpen = painelLoginOpen ?? localLogin;
  const setLoginOpen = onPainelLoginOpenChange ?? setLocalLogin;

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

  function fecharLogin() {
    setLoginOpen(false);
    void navigate({ to: "/", search: {}, replace: true });
  }

  return (
    <>
      <McSiteHeader loggedIn={loggedIn} checkingPainel={checkingPainel} onOpenPainel={() => void abrirPainel()} />

      <main>
        <section className="mc-hero mc-section--dark" id="inicio">
          <div className="mc-hero__glow" aria-hidden="true" />
          <div className="mc-container mc-hero__shell">
            <div className="mc-hero__grid">
              <div className="mc-hero__content">
                <h1 className="mc-hero__title">
                  Calhas sob medida para proteger sua obra da{" "}
                  <span className="mc-text-accent">infiltração ao acabamento</span>
                </h1>
                <p className="mc-hero__desc">{LANDING_HERO.desc}</p>
                <div className="mc-hero__actions">
                  <a href="#agendar" className="mc-btn mc-btn--primary mc-btn--lg">
                    <i className="bi bi-calendar-check" aria-hidden="true" /> Agendar visita
                  </a>
                  <a href="#solucoes" className="mc-btn mc-btn--outline mc-btn--lg">
                    Ver serviços
                  </a>
                </div>
              </div>

              <div className="mc-hero__media">
                <McHeroSlider slides={data.heroSlides} />
              </div>
            </div>

            <div className="mc-hero__perks" aria-label="Diferenciais">
              {LANDING_HERO_PERKS.map((perk) => (
                <article key={perk.title} className="mc-hero-perk">
                  <span className="mc-hero-perk__icon">
                    <i className={`bi ${perk.icon}`} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{perk.title}</strong>
                    <p>{perk.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section mc-section--light mc-section--needs" id="necessidades">
          <div className="mc-container">
            <header className="mc-section__head mc-section__head--center">
              <span className="mc-kicker mc-kicker--line">PARA CADA ETAPA, A CALHA IDEAL</span>
              <h2 className="mc-section__title">Soluções para cada necessidade</h2>
            </header>
            <div className="mc-needs__grid">
              {LANDING_NEEDS.map((item) => (
                <article key={item.title} className="mc-need-card">
                  <span className="mc-need-card__icon">
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                  </span>
                  <div className="mc-need-card__panel">
                    <div className="mc-need-card__content">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                    <figure className="mc-need-card__img">
                      <img src={item.img} alt="" loading="lazy" width={360} height={200} />
                    </figure>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section mc-section--dark mc-section--services" id="solucoes">
          <div className="mc-container">
            <header className="mc-section__head mc-section__head--center">
              <span className="mc-kicker mc-kicker--dash">LINHA COMPLETA</span>
              <h2 className="mc-section__title">Soluções completas em calhas e acabamentos</h2>
            </header>
            <div className="mc-services__grid">
              {servicos.map((s) => (
                <article key={s.slug} className="mc-service-card">
                  <div className="mc-service-card__head">
                    <span className="mc-service-card__icon">
                      <i className={`bi ${serviceIconForSlug(s.slug)}`} aria-hidden="true" />
                    </span>
                    <h3>{s.titulo}</h3>
                  </div>
                  <p>{s.texto}</p>
                  <div className="mc-service-card__img">
                    <Link to="/galeria/$slug" params={{ slug: s.slug }}>
                      <img src={s.img} alt={`${s.titulo} — Minas Calhas`} loading="lazy" width={280} height={120} />
                    </Link>
                  </div>
                  <Link to="/galeria/$slug" params={{ slug: s.slug }} className="mc-service-card__link">
                    Ver galeria <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mc-section mc-section--light mc-section--tech" id="tecnico">
          <div className="mc-container mc-tech__grid">
            <div className="mc-tech__content">
              <header className="mc-section__head mc-section__head--left mc-tech__head">
                <span className="mc-kicker mc-kicker--line">{LANDING_TECH.kicker}</span>
                <h2 className="mc-section__title">{LANDING_TECH.title}</h2>
              </header>
              <p className="mc-tech__intro">{LANDING_TECH.intro}</p>
              <ul className="mc-tech__checklist">
                {LANDING_TECH.items.map((item) => (
                  <li key={item.title}>
                    <span className="mc-tech__check" aria-hidden="true">
                      <i className="bi bi-check-lg" />
                    </span>
                    <p>
                      <strong>{item.title}</strong>: {item.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <McTechnicalDiagram />
          </div>
        </section>

        <section className="mc-section mc-section--dark mc-section--agendar" id="agendar">
          <div className="mc-container">
            <header className="mc-section__head mc-section__head--center">
              <span className="mc-kicker">VISITA TÉCNICA</span>
              <h2 className="mc-section__title">Prefere agendar uma visita completa?</h2>
              <p className="mc-section__subtitle">
                Preencha o formulário abaixo para agendarmos avaliação no local com todos os dados da obra.
              </p>
            </header>
            <div className="mc-agendar-card">
              <AcAgendarForm />
            </div>
          </div>
        </section>

        <section className="mc-contact-band" id="contato" aria-label="Contato e localização">
          <div className="mc-container mc-contact-band__inner">
            <div className="mc-contact-band__info">
              <h2>Fale com a Minas Calhas</h2>
              <p>Solicite seu orçamento sem compromisso.</p>
              <ul className="mc-contact-band__list">
                <li>
                  <i className="bi bi-whatsapp" aria-hidden="true" />
                  <a href={waUrl(HOME_SITE.whatsapp)} target="_blank" rel="noopener noreferrer">
                    {HOME_SITE.telefone1}
                  </a>
                </li>
                <li>
                  <i className="bi bi-telephone" aria-hidden="true" />
                  <a href={waUrl(HOME_SITE.whatsappSec)} target="_blank" rel="noopener noreferrer">
                    {HOME_SITE.telefone2}
                  </a>
                </li>
                <li>
                  <i className="bi bi-envelope" aria-hidden="true" />
                  <a href={`mailto:${HOME_SITE.email}`}>{HOME_SITE.email}</a>
                </li>
                <li>
                  <i className="bi bi-geo-alt" aria-hidden="true" />
                  <span>{HOME_SITE.endereco}</span>
                </li>
              </ul>
            </div>
            <div className="mc-contact-band__map">
              <iframe
                src={HOME_SITE.mapsEmbed}
                title="Localização Minas Calhas, Rua José Alves de Lima nº 10, Florínea SP"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      </main>

      <McSiteFooter />
      <AcSiteChat />
      {!loggedIn ? <AcLoginModal open={loginOpen} onClose={fecharLogin} /> : null}
    </>
  );
}
