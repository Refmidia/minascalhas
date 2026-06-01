import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { DashPageHero, NovaVisitaCta } from "@/components/admin/DashPageHero";

type Stats = {
  updatedAt: string;
  operacional: { agendado: number; orcamentado: number; confirmado: number; finalizado: number };
  financeiro: {
    mesLabel: string;
    confirmado: number;
    faturadoMes: number;
    faturadoMesQtd: number;
    totalGeral: number;
    margemMes: number;
  };
  charts: {
    daily: { labels: string[]; values: number[] };
    status: { labels: string[]; values: number[] };
  };
};

function money(v: number, hidden: boolean) {
  if (hidden) return "R$ ••••••";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DashboardView() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideMoney, setHideMoney] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; stats?: Stats; message?: string };
      if (!res.ok || !data.stats) throw new Error(data.message ?? "Falha ao carregar.");
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updatedLabel = stats
    ? new Date(stats.updatedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const fin = stats?.financeiro;

  return (
    <div className="analytics-page dash-form-page--pro">
      <DashPageHero
        title="Visão geral da operação"
        subtitle="Visitas, orçamentos e serviços concluídos em tempo real"
        iconClass="bi-speedometer2"
        cta={<NovaVisitaCta />}
      />

      <div className="dash-page-body dash-page-body--solo">
        {error ? <p className="text-danger small mb-3">{error}</p> : null}

        <section
          className={`analytics-section analytics-section--finance${hideMoney ? "" : " is-fin-valores-visiveis"}`}
          id="fin-painel-resumo"
          aria-labelledby="fin-painel-title"
        >
          <div className="analytics-section__head">
            <div>
              <div className="analytics-section__title-row">
                <h2 id="fin-painel-title" className="analytics-section__title">
                  Resumo financeiro
                </h2>
                <button
                  type="button"
                  className="analytics-fin-toggle"
                  aria-pressed={!hideMoney}
                  aria-label={hideMoney ? "Mostrar valores financeiros" : "Ocultar valores"}
                  title={hideMoney ? "Mostrar valores" : "Ocultar valores"}
                  onClick={() => setHideMoney((v) => !v)}
                >
                  <i className={`bi bi-eye${hideMoney ? "-slash" : ""}`} aria-hidden="true" />
                </button>
              </div>
              <p className="analytics-section__meta">Faturado do mês atual (reinicia todo dia 1)</p>
            </div>
            <div className="analytics-section__actions">
              <Link to="/painel/financeiro" className="analytics-btn analytics-btn--ghost analytics-btn--sm">
                <i className="bi bi-cash-coin" aria-hidden="true" /> Ver financeiro
              </Link>
            </div>
          </div>
          <div className="analytics-metrics" id="fin-painel-metrics">
            <Link to="/painel/confirmado" className="metric-card metric-card--finance">
              <div className="metric-card__top">
                <span className="metric-card__label">Confirmado</span>
                <span className="metric-card__icon metric-card__icon--green">
                  <i className="bi bi-journal-bookmark" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">{money(fin?.confirmado ?? 0, hideMoney)}</strong>
            </Link>
            <Link to="/painel/financeiro" className="metric-card metric-card--finance">
              <div className="metric-card__top">
                <span className="metric-card__label">Faturado — {fin?.mesLabel ?? ""}</span>
                <span className="metric-card__icon metric-card__icon--purple">
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">{money(fin?.faturadoMes ?? 0, hideMoney)}</strong>
            </Link>
            <Link to="/painel/financeiro" className="metric-card metric-card--finance">
              <div className="metric-card__top">
                <span className="metric-card__label">Total geral</span>
                <span className="metric-card__icon metric-card__icon--blue">
                  <i className="bi bi-cash-stack" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">{money(fin?.totalGeral ?? 0, hideMoney)}</strong>
            </Link>
            <Link to="/painel/financeiro" className="metric-card metric-card--finance">
              <div className="metric-card__top">
                <span className="metric-card__label">Margem geral — mês atual</span>
                <span className="metric-card__icon metric-card__icon--amber">
                  <i className="bi bi-graph-up-arrow" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">{money(fin?.margemMes ?? 0, hideMoney)}</strong>
            </Link>
          </div>
        </section>

        <section className="analytics-section" aria-labelledby="resumo-title">
          <div className="analytics-section__head">
            <div>
              <h2 id="resumo-title" className="analytics-section__title">
                Resumo operacional
              </h2>
              {updatedLabel ? (
                <p className="analytics-section__meta">Atualizado em {updatedLabel}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="analytics-btn analytics-btn--ghost analytics-btn--sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <i className={`bi bi-arrow-clockwise${loading ? " spin" : ""}`} aria-hidden="true" /> Atualizar
            </button>
          </div>

          <div className="analytics-metrics">
            <Link to="/painel/visitas" className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Visitas agendadas</span>
                <span className="metric-card__icon metric-card__icon--blue">
                  <i className="bi bi-calendar-check" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">
                {loading ? "—" : stats?.operacional.agendado ?? 0}
              </strong>
            </Link>
            <Link to="/painel/orcamentado" className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Orçamentado</span>
                <span className="metric-card__icon metric-card__icon--amber">
                  <i className="bi bi-clipboard2-pulse" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">
                {loading ? "—" : stats?.operacional.orcamentado ?? 0}
              </strong>
            </Link>
            <Link to="/painel/confirmado" className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Confirmado</span>
                <span className="metric-card__icon metric-card__icon--green">
                  <i className="bi bi-journal-bookmark" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">
                {loading ? "—" : stats?.operacional.confirmado ?? 0}
              </strong>
            </Link>
            <Link to="/painel/finalizado" className="metric-card">
              <div className="metric-card__top">
                <span className="metric-card__label">Finalizado</span>
                <span className="metric-card__icon metric-card__icon--purple">
                  <i className="bi bi-journal-check" aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-card__value">
                {loading ? "—" : stats?.operacional.finalizado ?? 0}
              </strong>
            </Link>
          </div>
        </section>

        <details className="analytics-filters">
          <summary className="analytics-filters__summary">
            <span>
              <i className="bi bi-funnel" aria-hidden="true" /> Filtros e visibilidade
            </span>
            <span className="analytics-filters__hint">Clique para expandir</span>
          </summary>
          <div className="analytics-filters__body">
            <p className="mb-2 text-secondary small">Atalhos rápidos por etapa do funil:</p>
            <div className="analytics-filters__chips">
              <Link to="/painel/visitas" className="analytics-chip">
                Visitas
              </Link>
              <Link to="/painel/orcamentado" className="analytics-chip">
                Orçamentado
              </Link>
              <Link to="/painel/confirmado" className="analytics-chip">
                Confirmado
              </Link>
              <Link to="/painel/finalizado" className="analytics-chip">
                Finalizado
              </Link>
              <Link to="/painel/material" className="analytics-chip">
                Materiais
              </Link>
              {user?.podeGerenciarUsuarios ? (
                <Link to="/painel/usuarios" className="analytics-chip">
                  Usuários
                </Link>
              ) : null}
              <Link to="/painel/financeiro" className="analytics-chip">
                Financeiro
              </Link>
            </div>
          </div>
        </details>

        {stats?.charts ? <DashboardCharts data={stats.charts} /> : null}
      </div>
    </div>
  );
}
