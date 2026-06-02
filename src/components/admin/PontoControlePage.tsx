import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { DashPageHero } from "@/components/admin/DashPageHero";
import { PontoFuncCell, PontoJornadaHoras } from "@/components/admin/PontoFuncCell";
import {
  formatDataHoraPonto,
  pontoClasseBadge,
  pontoLabelTipo,
} from "@/lib/ponto-display";
import { Route as PontoControleRoute } from "@/routes/painel/ponto-controle";
import { dashConfirm, dashToast } from "@/lib/dash-ui";
import { pontoDiaChave, pontoHojeIso } from "@/lib/ponto-timezone";

type PontoJornada = {
  usuario_id: number;
  usuario_nome: string;
  thumb: string;
  data: string;
  data_fmt: string;
  entrada_fmt: string;
  almoco_fmt: string;
  retorno_fmt: string;
  saida_fmt: string;
  intervalo_fmt: string;
  total_fmt: string;
  aberto: boolean;
  status_label: string;
};

type PontoRegistroAdmin = {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  thumb: string;
  tipo: string;
  registrado_em: string;
};

type FuncionarioOpt = { id: number; nome: string; thumb: string };

export function PontoControlePage() {
  const { user, ready } = useAdminAuth();
  const navigate = useNavigate({ from: PontoControleRoute.fullPath });
  const search = PontoControleRoute.useSearch();

  const hoje = pontoHojeIso();
  const primeiroMes = `${hoje.slice(0, 8)}01`;
  const usuarioFiltro = search.usuario ?? 0;
  const de = search.de ?? primeiroMes;
  const ate = search.ate ?? hoje;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [funcionarios, setFuncionarios] = useState<FuncionarioOpt[]>([]);
  const [jornadas, setJornadas] = useState<PontoJornada[]>([]);
  const [registros, setRegistros] = useState<PontoRegistroAdmin[]>([]);
  const [detalheOpen, setDetalheOpen] = useState(true);

  const [fUsuario, setFUsuario] = useState(String(usuarioFiltro || ""));
  const [fDe, setFDe] = useState(de);
  const [fAte, setFAte] = useState(ate);

  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const qs = new URLSearchParams();
      if (usuarioFiltro > 0) qs.set("usuario", String(usuarioFiltro));
      qs.set("de", de);
      qs.set("ate", ate);
      const res = await fetch(`/api/admin/ponto-controle?${qs}`, { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        updated_at?: string;
        funcionarios?: FuncionarioOpt[];
        jornadas?: PontoJornada[];
        registros?: PontoRegistroAdmin[];
      };
      if (!res.ok) throw new Error(json.message ?? "Erro ao carregar.");
      setUpdatedAt(json.updated_at ?? "");
      setFuncionarios(json.funcionarios ?? []);
      setJornadas(json.jornadas ?? []);
      setRegistros(json.registros ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [usuarioFiltro, de, ate]);

  useEffect(() => {
    if (!ready) return;
    if (user && user.visao !== "admin") {
      void navigate({ to: "/painel/ponto" });
      return;
    }
    void load();
  }, [load, ready, user, navigate]);

  useEffect(() => {
    setFUsuario(String(usuarioFiltro || ""));
    setFDe(de);
    setFAte(ate);
  }, [usuarioFiltro, de, ate]);

  useEffect(() => {
    document.body.classList.add("dashboard-page--ponto");
    return () => document.body.classList.remove("dashboard-page--ponto");
  }, []);

  function aplicarFiltros(e: React.FormEvent) {
    e.preventDefault();
    void navigate({
      search: {
        usuario: fUsuario ? Number(fUsuario) : undefined,
        de: fDe || undefined,
        ate: fAte || undefined,
      },
    });
  }

  async function excluirJornada(j: PontoJornada) {
    const qtd = registros.filter(
      (r) => r.usuario_id === j.usuario_id && pontoDiaChave(r.registrado_em) === j.data,
    ).length;
    const msg =
      qtd > 0
        ? `Excluir todos os ${qtd} registro(s) de ${j.usuario_nome} em ${j.data_fmt}? Esta ação não pode ser desfeita.`
        : `Excluir a jornada de ${j.usuario_nome} em ${j.data_fmt}?`;
    const ok = await dashConfirm({
      title: "Excluir jornada?",
      message: msg,
      confirmText: "Excluir tudo",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const qs = new URLSearchParams({
        usuario: String(j.usuario_id),
        data: j.data,
      });
      const res = await fetch(`/api/admin/ponto-controle?${qs}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Não foi possível excluir.");
      dashToast(json.message ?? "Jornada excluída.", "success");
      void load();
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro.", "danger");
    }
  }

  async function excluirRegistro(r: PontoRegistroAdmin) {
    const { data, hora } = formatDataHoraPonto(r.registrado_em);
    const msg = `Excluir o registro de ${pontoLabelTipo(r.tipo)} de ${r.usuario_nome} em ${data} ${hora}? Esta ação não pode ser desfeita.`;
    const ok = await dashConfirm({
      title: "Excluir registro?",
      message: msg,
      confirmText: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/ponto-controle?id=${r.id}`, {
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
    <div className="analytics-page dash-form-page--pro">
      <DashPageHero
        title="Controle de ponto"
        subtitle="Entradas, saídas e horas dos funcionários"
        iconClass="bi-clock-history"
        accent="ponto"
        layout="header"
        showNovaVisita={false}
      />

      <div className="dash-page-body dash-page-body--with-header">
        <div className="dash-ponto-admin">
          {erro ? <div className="alert alert-danger">{erro}</div> : null}
          {loading ? <p className="text-muted py-3">Carregando…</p> : null}

          {!loading ? (
            <>
              <div className="inv-list-toolbar mb-3">
                <div className="inv-list-toolbar__stats">
                  <span className="inv-list-stat">
                    Atualizado em <strong>{updatedAt}</strong>
                  </span>
                  <span className="inv-list-stat">{jornadas.length} jornada(s) no período</span>
                </div>
                <span className="inv-list-toolbar__badge inv-list-toolbar__badge--ponto">
                  <i className="bi bi-shield-lock" aria-hidden="true" /> Administração
                </span>
              </div>

              <section className="dash-edit-modal__panel mb-3">
                <h2 className="dash-edit-modal__panel-title">
                  <i className="bi bi-funnel" aria-hidden="true" /> Filtros
                </h2>
                <form className="dash-form" onSubmit={aplicarFiltros}>
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-4">
                      <label className="dash-edit-modal__label" htmlFor="filtro-usuario">
                        Funcionário
                      </label>
                      <select
                        id="filtro-usuario"
                        className="form-select dash-edit-modal__input"
                        value={fUsuario}
                        onChange={(e) => setFUsuario(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {funcionarios.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="dash-edit-modal__label" htmlFor="filtro-de">
                        De
                      </label>
                      <input
                        type="date"
                        id="filtro-de"
                        className="form-control dash-edit-modal__input"
                        value={fDe}
                        onChange={(e) => setFDe(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <label className="dash-edit-modal__label" htmlFor="filtro-ate">
                        Até
                      </label>
                      <input
                        type="date"
                        id="filtro-ate"
                        className="form-control dash-edit-modal__input"
                        value={fAte}
                        onChange={(e) => setFAte(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-2 d-grid">
                      <button type="submit" className="btn visitas-orc-add-btn">
                        <i className="bi bi-search" aria-hidden="true" /> Filtrar
                      </button>
                    </div>
                  </div>
                </form>
              </section>

              <section className="dash-edit-modal__panel mb-3">
                <h2 className="dash-edit-modal__panel-title">
                  <i className="bi bi-table" aria-hidden="true" /> Jornadas no período
                </h2>
                <div className="table-responsive dash-ponto-table-shell">
                  <table className="table table-sm dash-ponto-table dash-ponto-table--pro mb-0">
                    <thead>
                      <tr>
                        <th className="dash-ponto-table__col-func">Funcionário</th>
                        <th className="text-center">Data</th>
                        <th className="text-center">Entrada</th>
                        <th className="text-center">Almoço</th>
                        <th className="text-center">Retorno</th>
                        <th className="text-center">Saída</th>
                        <th className="text-center">Intervalo</th>
                        <th className="text-center">Trabalhado</th>
                        <th className="text-center">Status</th>
                        <th className="text-end dash-ponto-table__col-acoes">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jornadas.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="dash-ponto-table__empty">
                            Nenhum registro encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        jornadas.map((j) => (
                          <tr key={`${j.usuario_id}-${j.data}`}>
                            <td className="dash-ponto-table__col-func">
                              <PontoFuncCell nome={j.usuario_nome} thumb={j.thumb} />
                            </td>
                            <td className="text-center dash-ponto-cel--data">{j.data_fmt}</td>
                            <PontoJornadaHoras
                              entrada={j.entrada_fmt}
                              almoco={j.almoco_fmt}
                              retorno={j.retorno_fmt}
                              saida={j.saida_fmt}
                              intervalo={j.intervalo_fmt}
                              total={j.total_fmt}
                            />
                            <td className="text-center">
                              {j.aberto ? (
                                <span className="dash-ponto-status dash-ponto-status--aberto">
                                  {j.status_label}
                                </span>
                              ) : (
                                <span className="dash-ponto-status dash-ponto-status--ok">Encerrado</span>
                              )}
                            </td>
                            <td className="text-end dash-ponto-table__col-acoes">
                              <button
                                type="button"
                                className="dash-pag-func-act dash-pag-func-act--delete"
                                title="Excluir jornada inteira"
                                aria-label={`Excluir jornada de ${j.usuario_nome} em ${j.data_fmt}`}
                                onClick={() => void excluirJornada(j)}
                              >
                                <i className="bi bi-trash3" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {registros.length > 0 ? (
                <section
                  className={`dash-edit-modal__panel dash-ponto-detalhe${detalheOpen ? " is-open" : ""}`}
                >
                  <div className="dash-ponto-detalhe__head">
                    <button
                      type="button"
                      className={`dash-ponto-detalhe__toggle${detalheOpen ? " is-open" : ""}`}
                      aria-expanded={detalheOpen}
                      aria-controls="ponto-detalhe-corpo"
                      onClick={() => setDetalheOpen((v) => !v)}
                      title={detalheOpen ? "Recolher detalhe" : "Ver todos os registros"}
                    >
                      <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                    <h2 className="dash-edit-modal__panel-title dash-ponto-detalhe__title mb-0">
                      <i className="bi bi-list-check" aria-hidden="true" /> Todos os registros (detalhe)
                    </h2>
                    <span className="dash-ponto-detalhe__meta">
                      {registros.length} registro{registros.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {detalheOpen ? (
                    <div id="ponto-detalhe-corpo" className="dash-ponto-detalhe__body">
                      <div className="table-responsive dash-ponto-table-shell">
                        <table className="table table-sm dash-ponto-table dash-ponto-table--pro mb-0">
                          <thead>
                            <tr>
                              <th className="text-center dash-ponto-table__col-id">#</th>
                              <th className="dash-ponto-table__col-func">Funcionário</th>
                              <th className="text-center">Tipo</th>
                              <th className="text-center">Data e hora</th>
                              <th className="text-end">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registros.map((r) => {
                              const { data, hora } = formatDataHoraPonto(r.registrado_em);
                              return (
                                <tr key={r.id} data-ponto-id={r.id}>
                                  <td className="text-center dash-ponto-table__id">{r.id}</td>
                                  <td className="dash-ponto-table__col-func">
                                    <PontoFuncCell nome={r.usuario_nome} thumb={r.thumb} />
                                  </td>
                                  <td className="text-center">
                                    <span className={`dash-ponto-tipo ${pontoClasseBadge(r.tipo)}`}>
                                      {pontoLabelTipo(r.tipo)}
                                    </span>
                                  </td>
                                  <td className="text-center dash-ponto-table__cel-datetime">
                                    <div className="dash-ponto-datetime">
                                      <span className="dash-ponto-datetime__data">{data}</span>
                                      <span className="dash-ponto-datetime__hora">{hora}</span>
                                    </div>
                                  </td>
                                  <td className="text-end">
                                    <button
                                      type="button"
                                      className="dash-pag-func-act dash-pag-func-act--delete"
                                      title="Excluir registro"
                                      aria-label="Excluir registro"
                                      onClick={() => void excluirRegistro(r)}
                                    >
                                      <i className="bi bi-trash3" aria-hidden="true" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="dash-ponto-detalhe__hint mb-0">
                      Clique na seta para ver cada batida e excluir registros individualmente.
                    </p>
                  )}
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
