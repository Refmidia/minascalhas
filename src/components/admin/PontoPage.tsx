import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { DashPageHero, NovaVisitaCta } from "@/components/admin/DashPageHero";
import { UsuarioAssinaturaEditor } from "@/components/admin/UsuarioAssinaturaEditor";
import { formatDataHoraPonto, pontoClasseBadge, pontoLabelTipo } from "@/lib/ponto-display";
import { weekdayCurtoIso } from "@/lib/ponto-relatorio";
import { PONTO_TIMEZONE, pontoHojeIso, pontoSerializarDatetime } from "@/lib/ponto-timezone";
import { dashConfirm, dashToast } from "@/lib/dash-ui";

type Estado = {
  status: string;
  label: string;
  pode_entrada: boolean;
  pode_almoco: boolean;
  pode_retorno: boolean;
  pode_saida: boolean;
};

type Registro = { id: number; tipo: string; registrado_em: string };

type DiaRegistros = {
  iso: string;
  data: string;
  weekday: string;
  itens: Array<Registro & { hora: string }>;
};

function agruparRegistrosPorDia(regs: Registro[]): DiaRegistros[] {
  const grupos: DiaRegistros[] = [];
  const index = new Map<string, number>();
  for (const reg of regs) {
    const { data, hora } = formatDataHoraPonto(reg.registrado_em);
    const iso = pontoSerializarDatetime(reg.registrado_em).slice(0, 10);
    let i = index.get(iso);
    if (i == null) {
      i = grupos.length;
      index.set(iso, i);
      grupos.push({ iso, data, weekday: weekdayCurtoIso(iso), itens: [] });
    }
    grupos[i].itens.push({ ...reg, hora: hora.slice(0, 5) });
  }
  return grupos;
}

function badgeClass(status: string) {
  if (status === "trabalhando") return "on";
  if (status === "almoco") return "almoco";
  return "off";
}

export function PontoPage() {
  const { user } = useAdminAuth();
  const podeExcluir = user?.visao === "admin";
  const isFuncionario = user?.visao === "funcionário";

  const [nome, setNome] = useState("");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [historico, setHistorico] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [relogio, setRelogio] = useState(
    new Date().toLocaleTimeString("pt-BR", {
      timeZone: PONTO_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ponto", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        nome?: string;
        estado?: Estado;
        historico?: Registro[];
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "Erro ao carregar ponto.");
      setNome(json.nome ?? "");
      setEstado(json.estado ?? null);
      setHistorico(json.historico ?? []);
    } catch (e) {
      dashToast(e instanceof Error ? e.message : "Erro.", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      setRelogio(
        new Date().toLocaleTimeString("pt-BR", {
          timeZone: PONTO_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function registrar(tipo: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ponto", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        estado?: Estado;
        historico?: Registro[];
      };
      if (!res.ok) {
        dashToast(json.message ?? "Não foi possível registrar.", "warning");
        return;
      }
      dashToast(json.message ?? "Registrado!", "success");
      if (json.estado) setEstado(json.estado);
      if (json.historico) setHistorico(json.historico);
    } catch {
      dashToast("Erro de comunicação.", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function excluirRegistro(reg: Registro) {
    const { data, hora } = formatDataHoraPonto(reg.registrado_em);
    const msg = `Excluir o registro de ${pontoLabelTipo(reg.tipo)} em ${data} ${hora}? Esta ação não pode ser desfeita.`;
    const ok = await dashConfirm({
      title: "Excluir registro?",
      message: msg,
      confirmText: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/ponto-controle?id=${reg.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Não foi possível excluir.");
      dashToast(json.message ?? "Registro excluído.", "success");
      void load();
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro.", "danger");
    }
  }

  return (
    <div className="dash-form-page dash-form-page--pro dash-ponto-page">
      <DashPageHero
        title="Bate-ponto"
        subtitle="Registre entrada, almoço, retorno e saída"
        iconClass="bi-clock-history"
        layout="form"
        showNovaVisita={false}
        cta={
          <div className="dash-ponto-hero__actions">
            {isFuncionario ? (
              <Link to="/painel/agendar" className="dash-form-page__cta dash-form-page__cta--agendar">
                <i className="bi bi-calendar4-range" aria-hidden="true" />
                <span>Agendar visitas</span>
              </Link>
            ) : null}
            {podeExcluir ? (
              <Link to="/painel/ponto-controle" className="btn btn-sm btn-outline-primary">
                <i className="bi bi-people" aria-hidden="true" /> Controle de todos
              </Link>
            ) : !isFuncionario ? (
              <NovaVisitaCta />
            ) : null}
          </div>
        }
      />

      <div className="dash-page-body dash-page-body--solo">
        {loading ? <p className="text-muted py-3">Carregando…</p> : null}

        {!loading && estado ? (
          <>
            <section className="dash-edit-modal__panel dash-ponto-acoes">
              <div className="dash-ponto-acoes__top">
                <div className="dash-ponto-acoes__meta">
                  <span className="dash-ponto-acoes__user">
                    <i className="bi bi-person-badge" aria-hidden="true" />
                    {nome}
                  </span>
                  <span className="dash-ponto-clock" aria-live="polite">
                    {relogio}
                  </span>
                </div>
                <div
                  className={`dash-ponto-badge dash-ponto-badge--${badgeClass(estado.status)}`}
                  id="ponto-status-badge"
                >
                  <span className="dash-ponto-badge__dot" aria-hidden="true" />
                  <span>{estado.label}</span>
                </div>
              </div>

              <div className="dash-ponto-grid" role="group" aria-label="Registrar ponto">
                <button
                  type="button"
                  className="dash-ponto-card-btn dash-ponto-card-btn--entrada"
                  disabled={busy || !estado.pode_entrada}
                  onClick={() => void registrar("entrada")}
                >
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  <span>Entrada</span>
                </button>
                <button
                  type="button"
                  className="dash-ponto-card-btn dash-ponto-card-btn--almoco"
                  disabled={busy || !estado.pode_almoco}
                  onClick={() => void registrar("almoco")}
                >
                  <i className="bi bi-cup-hot" aria-hidden="true" />
                  <span>Almoço</span>
                </button>
                <button
                  type="button"
                  className="dash-ponto-card-btn dash-ponto-card-btn--retorno"
                  disabled={busy || !estado.pode_retorno}
                  onClick={() => void registrar("retorno_almoco")}
                >
                  <i className="bi bi-arrow-return-left" aria-hidden="true" />
                  <span>Retorno</span>
                </button>
                <button
                  type="button"
                  className="dash-ponto-card-btn dash-ponto-card-btn--saida"
                  disabled={busy || !estado.pode_saida}
                  onClick={() => void registrar("saida")}
                >
                  <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  <span>Saída</span>
                </button>
              </div>
            </section>

            {user?.id ? (
              <UsuarioAssinaturaEditor
                usuarioId={user.id}
                nome={nome || user.nome}
                ocultarDepoisDeSalvar
              />
            ) : null}

            <section className="dash-edit-modal__panel dash-ponto-registros">
              <h2 className="dash-edit-modal__panel-title">
                <i className="bi bi-journal-text" aria-hidden="true" />
                Registros
              </h2>
              {historico.length === 0 ? (
                <p className="dash-ponto-dias__vazio">
                  Nenhum registro ainda. Use os botões acima para marcar o ponto.
                </p>
              ) : (
                <div className="dash-ponto-dias">
                  {agruparRegistrosPorDia(historico).map((dia) => (
                    <article key={dia.iso} className="dash-ponto-dia">
                      <header className="dash-ponto-dia__head">
                        <span className="dash-ponto-dia__wd">{dia.weekday}</span>
                        <span className="dash-ponto-dia__data">{dia.data}</span>
                        {dia.iso === pontoHojeIso() ? (
                          <span className="dash-ponto-dia__hoje">Hoje</span>
                        ) : null}
                      </header>
                      <ul className="dash-ponto-dia__lista">
                        {dia.itens.map((reg) => (
                          <li key={reg.id} className="dash-ponto-dia__item">
                            <time className="dash-ponto-dia__hora" dateTime={reg.registrado_em}>
                              {reg.hora}
                            </time>
                            <span className={`dash-ponto-tipo ${pontoClasseBadge(reg.tipo)}`}>
                              {pontoLabelTipo(reg.tipo)}
                            </span>
                            {podeExcluir ? (
                              <button
                                type="button"
                                className="dash-ponto-dia__excluir"
                                title="Excluir registro"
                                onClick={() => void excluirRegistro(reg)}
                              >
                                <i className="bi bi-trash" aria-hidden="true" />
                                <span className="visually-hidden">Excluir</span>
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
