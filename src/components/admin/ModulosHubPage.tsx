import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { enterJoaoFinancas } from "@/lib/joao-financas/auth.functions";

const YEAR = new Date().getFullYear();

export function ModulosHubPage() {
  const { user, logout, ready } = useAdminAuth();
  const navigate = useNavigate();
  const [abrindoFinancas, setAbrindoFinancas] = useState(false);

  if (!ready) {
    return (
      <main className="mc-hub">
        <div className="mc-hub__bg" aria-hidden="true" />
        <div className="mc-hub__loading">
          <span className="mc-hub__spinner" aria-hidden="true" />
          <p>Carregando módulos…</p>
        </div>
      </main>
    );
  }

  const primeiroNome = (user?.nome || "Usuário").split(/\s+/)[0];

  function abrirMinasCalhas() {
    void navigate({ to: "/painel" });
  }

  async function abrirJoaoFinancas() {
    if (abrindoFinancas) return;
    setAbrindoFinancas(true);
    try {
      await enterJoaoFinancas();
      await navigate({ to: "/financas/dashboard" });
    } catch {
      setAbrindoFinancas(false);
      window.alert("Não foi possível abrir o João Finanças. Confirme que o banco MySQL está configurado.");
    }
  }

  async function sair() {
    await logout();
    window.location.assign("/?painel=login");
  }

  return (
    <main className="mc-hub">
      <div className="mc-hub__bg" aria-hidden="true" />

      <header className="mc-hub__top">
        <Link to="/" className="mc-hub__brand" aria-label="Minas Calhas">
          <img
            src="/images/logo/logo-branco.png"
            alt="Minas Calhas"
            width={160}
            height={48}
            className="mc-hub__logo"
          />
        </Link>
        <div className="mc-hub__user">
          <span>
            Olá, <strong>{primeiroNome}</strong>
          </span>
          <button type="button" className="mc-hub__logout" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </header>

      <section className="mc-hub__main">
        <div className="mc-hub__intro">
          <p className="mc-hub__kicker">Painel Minas Calhas</p>
          <h1>Escolha o módulo</h1>
          <p className="mc-hub__sub">Dois espaços, um acesso — selecione onde deseja trabalhar.</p>
          <div className="mc-hub__divider" aria-hidden="true">
            <span />
            <i />
            <i />
            <i />
            <i />
            <span />
          </div>
        </div>

        <div className="mc-hub__grid">
          <button type="button" className="mc-hub__card" onClick={abrirMinasCalhas}>
            <span className="mc-hub__card-watermark" aria-hidden="true">
              <i className="bi bi-house-door" />
            </span>
            <span className="mc-hub__card-tag">Módulo principal</span>
            <span className="mc-hub__card-row">
              <span className="mc-hub__card-icon" aria-hidden="true">
                <i className="bi bi-building" />
              </span>
              <span className="mc-hub__card-body">
                <span className="mc-hub__card-title">MINAS CALHAS</span>
                <span className="mc-hub__card-desc">
                  Visitas, orçamentos, obras, clientes, equipe e o dia a dia da empresa.
                </span>
              </span>
            </span>
            <span className="mc-hub__card-cta">
              Abrir módulo
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className="mc-hub__card"
            onClick={() => void abrirJoaoFinancas()}
            disabled={abrindoFinancas}
          >
            <span className="mc-hub__card-watermark" aria-hidden="true">
              <i className="bi bi-currency-dollar" />
            </span>
            <span className="mc-hub__card-tag">Módulo financeiro</span>
            <span className="mc-hub__card-row">
              <span className="mc-hub__card-icon" aria-hidden="true">
                <i className="bi bi-wallet2" />
              </span>
              <span className="mc-hub__card-body">
                <span className="mc-hub__card-title">JOÃO FINANÇAS</span>
                <span className="mc-hub__card-desc">
                  Contas, fluxo de caixa, dívidas e controles financeiros pessoais.
                </span>
              </span>
            </span>
            <span className="mc-hub__card-cta">
              {abrindoFinancas ? "Abrindo…" : "Abrir módulo"}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
          </button>
        </div>

        <div className="mc-hub__features">
          <div className="mc-hub__feature">
            <span className="mc-hub__feature-icon" aria-hidden="true">
              <i className="bi bi-shield-check" />
            </span>
            <div>
              <strong>Segurança</strong>
              <p>Seus dados estão protegidos com criptografia avançada.</p>
            </div>
          </div>
          <div className="mc-hub__feature">
            <span className="mc-hub__feature-icon" aria-hidden="true">
              <i className="bi bi-arrow-repeat" />
            </span>
            <div>
              <strong>Sincronização</strong>
              <p>Informações atualizadas em tempo real.</p>
            </div>
          </div>
          <div className="mc-hub__feature">
            <span className="mc-hub__feature-icon" aria-hidden="true">
              <i className="bi bi-headset" />
            </span>
            <div>
              <strong>Suporte</strong>
              <p>Precisa de ajuda? Fale com nossa equipe.</p>
            </div>
          </div>
        </div>

        <p className="mc-hub__copy">© {YEAR} Minas Calhas. Todos os direitos reservados.</p>
      </section>
    </main>
  );
}
