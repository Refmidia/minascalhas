import { Link } from "@tanstack/react-router";

import { HOME_SITE, LANDING_NAV, LANDING_SERVICE_LINKS, waUrl } from "@/data/home-config";
export function McSiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mc-footer mc-section--dark">
      <div className="mc-container mc-footer__grid">
        <div className="mc-footer__brand">
          <img
            className="mc-footer__logo"
            src={HOME_SITE.img.logoFooter}
            width={160}
            height={56}
            alt="Minas Calhas"
          />
          <p>
            Especialistas em calhas, rufos, pingadeiras e condutores com fabricação sob medida e instalação
            profissional em Florínea e região.
          </p>
          <div className="mc-footer__social" aria-label="Redes sociais">
            <a href={waUrl(HOME_SITE.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <i className="bi bi-whatsapp" aria-hidden="true" />
            </a>
            <a href={HOME_SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="bi bi-instagram" aria-hidden="true" />
            </a>
            <a
              href={HOME_SITE.mapsEmbed.replace("output=embed", "")}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Localização"
            >
              <i className="bi bi-geo-alt" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mc-footer__title">Navegação</h3>
          <ul className="mc-footer__links">
            {LANDING_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
            <li>
              <Link to="/galeria">Galeria</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mc-footer__title">Serviços</h3>
          <ul className="mc-footer__links">
            {LANDING_SERVICE_LINKS.map((item) =>
              item.href.startsWith("/") ? (
                <li key={item.label}>
                  <Link to={item.href}>{item.label}</Link>
                </li>
              ) : (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>

      <div className="mc-footer__bottom">
        <div className="mc-container mc-footer__bottom-inner">
          <p>&copy; {year} Minas Calhas. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
