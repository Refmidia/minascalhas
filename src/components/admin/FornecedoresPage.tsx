import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashPageHero } from "@/components/admin/DashPageHero";
import { TelefoneCell } from "@/components/admin/inventario-ui";
import { FornecedorControleView } from "@/components/admin/FornecedorControleView";
import type { FornecedorControlePainel } from "@/lib/fornecedor-controle.server";
import { ModalFornecedor } from "@/components/admin/modals/ModalFornecedor";
import { Route as FornecedoresRoute } from "@/routes/painel/fornecedores";
import {
  fetchEntregaDetalhe,
  fetchFornecedoresPainel,
  postFornecedoresAction,
  type EntregaDetalhe,
  type EntregaListaRow,
  type FornecedorInput,
  type FornecedorRow,
} from "@/lib/fornecedores-client";
import {
  entregaNumeroNota,
  formatCnpjExib,
  formatDataHora,
  formatMoeda,
  fornecedorRotulo,
  fornecedorRotuloEmpresa,
} from "@/lib/fornecedores-display";

function toast(msg: string, tipo: "success" | "danger" = "success") {
  const el = document.createElement("div");
  el.className = `alert alert-${tipo === "success" ? "success" : "danger"} position-fixed top-0 end-0 forn-toast`;
  el.setAttribute("role", "alert");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function badgeRecebimento(status: string, qtdItens: number, qtdRecebidos: number) {
  if (status === "recebido") {
    return <span className="forn-entrega-badge forn-entrega-badge--ok">Recebido</span>;
  }
  if (status === "parcial") {
    return (
      <>
        <span className="forn-entrega-badge forn-entrega-badge--parcial">Parcial</span>
        <small className="d-block text-muted mt-1">
          {qtdRecebidos}/{qtdItens} itens
        </small>
      </>
    );
  }
  return <span className="forn-entrega-badge forn-entrega-badge--pend">Aguardando</span>;
}

function badgePagamento(status: string, pagSt: string | null) {
  if (status !== "recebido" && status !== "parcial") {
    return <span className="text-muted">—</span>;
  }
  if (pagSt === "pago") {
    return <span className="forn-entrega-badge forn-entrega-badge--pago">Pago</span>;
  }
  return <span className="forn-entrega-badge forn-entrega-badge--pg-pend">Pendente</span>;
}

function EntregaDetalheView({
  entrega,
  statusTab,
  onReload,
  onVoltar,
}: {
  entrega: EntregaDetalhe;
  statusTab: string;
  onReload: () => void;
  onVoltar: () => void;
}) {
  const [pagamento, setPagamento] = useState<"pago" | "pendente">("pendente");
  const [selReceber, setSelReceber] = useState<number[]>([]);
  const [selPagar, setSelPagar] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const pendentes = entrega.itens.filter((i) => !i.recebido);
  const pagPendentes = entrega.itens.filter(
    (i) => i.recebido && i.pagamento_status !== "pago",
  );

  useEffect(() => {
    setSelReceber(pendentes.map((i) => i.id));
    setSelPagar(pagPendentes.map((i) => i.id));
  }, [entrega.id]);

  const totalSelReceber = useMemo(
    () =>
      entrega.itens
        .filter((i) => selReceber.includes(i.id))
        .reduce((s, i) => s + i.total, 0),
    [entrega.itens, selReceber],
  );

  const totalSelPagar = useMemo(
    () =>
      entrega.itens
        .filter((i) => selPagar.includes(i.id))
        .reduce((s, i) => s + i.total, 0),
    [entrega.itens, selPagar],
  );

  async function confirmarRecebimento() {
    if (selReceber.length === 0) {
      window.alert("Selecione ao menos um item.");
      return;
    }
    setBusy(true);
    try {
      const res = await postFornecedoresAction({
        action: "receber_itens",
        entrega_id: entrega.id,
        item_ids: selReceber,
        pagamento_status: pagamento,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) onReload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro.", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function receberTodos() {
    if (!window.confirm("Receber todos os itens pendentes desta nota?")) return;
    setBusy(true);
    try {
      const res = await postFornecedoresAction({
        action: "receber_entrega",
        entrega_id: entrega.id,
        pagamento_status: pagamento,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) onReload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro.", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function marcarPago() {
    if (selPagar.length === 0) {
      window.alert("Selecione itens para marcar como pago.");
      return;
    }
    setBusy(true);
    try {
      const res = await postFornecedoresAction({
        action: "pagar_itens",
        entrega_id: entrega.id,
        item_ids: selPagar,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) onReload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro.", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-form-card mb-3 forn-entrega-detalhe">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="dash-form-block__title h5 mb-1">{entregaNumeroNota(entrega.id)}</h2>
          <p className="mb-0 text-muted small">
            <strong>{fornecedorRotuloEmpresa(entrega)}</strong>
            {entrega.usuario_nome ? ` · Enviado por ${entrega.usuario_nome}` : null}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link
            to="/painel/fornecedores"
            search={{ nota: entrega.id }}
            target="_blank"
            className="analytics-btn analytics-btn--outline analytics-btn--sm"
          >
            <i className="bi bi-printer" aria-hidden="true" /> Imprimir nota
          </Link>
          {pendentes.length > 0 ? (
            <button
              type="button"
              className="analytics-btn analytics-btn--outline analytics-btn--sm"
              disabled={busy}
              onClick={() => void receberTodos()}
            >
              <i className="bi bi-check-all" aria-hidden="true" /> Receber todos
            </button>
          ) : null}
          <button
            type="button"
            className="analytics-btn analytics-btn--outline analytics-btn--sm"
            onClick={onVoltar}
          >
            <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar à lista
          </button>
        </div>
      </div>

      <div className="inv-table-shell">
        <div className="table-responsive">
          <table className="table inv-data-table table-sm align-middle mb-0 forn-entrega-itens-table">
            <thead>
              <tr>
                {pendentes.length > 0 ? <th className="forn-entrega-itens-table__sel" /> : null}
                {pagPendentes.length > 0 ? <th className="forn-entrega-itens-table__sel" /> : null}
                <th>Material</th>
                <th className="text-end">Metros</th>
                <th className="text-end">R$/m</th>
                <th className="text-end">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {entrega.itens.map((item) => {
                const podeReceber = !item.recebido;
                const podePagar = item.recebido && item.pagamento_status !== "pago";
                return (
                  <tr
                    key={item.id}
                    className={item.recebido ? "forn-entrega-item--ok" : "forn-entrega-item--pend"}
                  >
                    {pendentes.length > 0 ? (
                      <td className="forn-entrega-itens-table__sel">
                        {podeReceber ? (
                          <input
                            type="checkbox"
                            className="form-check-input forn-item-entrega-cb"
                            checked={selReceber.includes(item.id)}
                            onChange={(e) => {
                              setSelReceber((prev) =>
                                e.target.checked
                                  ? [...prev, item.id]
                                  : prev.filter((id) => id !== item.id),
                              );
                            }}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    {pagPendentes.length > 0 ? (
                      <td className="forn-entrega-itens-table__sel">
                        {podePagar ? (
                          <input
                            type="checkbox"
                            className="form-check-input forn-item-pagamento-cb"
                            checked={selPagar.includes(item.id)}
                            onChange={(e) => {
                              setSelPagar((prev) =>
                                e.target.checked
                                  ? [...prev, item.id]
                                  : prev.filter((id) => id !== item.id),
                              );
                            }}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    <td>
                      {item.material_nome}
                      {item.observacao ? (
                        <>
                          <br />
                          <small className="text-muted">{item.observacao}</small>
                        </>
                      ) : null}
                    </td>
                    <td className="text-end">{formatMoeda(item.metros)}</td>
                    <td className="text-end">R$ {formatMoeda(item.valor_unitario)}</td>
                    <td className="text-end">
                      <strong>R$ {formatMoeda(item.total)}</strong>
                    </td>
                    <td>
                      {item.recebido ? (
                        <>
                          <span className="forn-entrega-badge forn-entrega-badge--ok">Recebido</span>
                          {item.pagamento_status === "pago" ? (
                            <span className="forn-entrega-badge forn-entrega-badge--pago ms-1">
                              Pago
                            </span>
                          ) : (
                            <span className="forn-entrega-badge forn-entrega-badge--pg-pend ms-1">
                              Pendente
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="forn-entrega-badge forn-entrega-badge--pend">Aguardando</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={99} className="text-end">
                  <strong>Total nota</strong>
                </td>
                <td className="text-end">
                  <strong>R$ {formatMoeda(entrega.total_geral)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {pendentes.length > 0 ? (
        <div className="forn-receber-itens-bar mt-3">
          <fieldset className="forn-pagamento-opcoes mb-0">
            <legend className="form-label mb-2">Pagamento dos itens selecionados</legend>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="pagamento_status"
                id="receber-itens-pago"
                checked={pagamento === "pago"}
                onChange={() => setPagamento("pago")}
              />
              <label className="form-check-label" htmlFor="receber-itens-pago">
                <strong>Já paguei</strong> — quitado com o fornecedor
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="pagamento_status"
                id="receber-itens-pendente"
                checked={pagamento === "pendente"}
                onChange={() => setPagamento("pendente")}
              />
              <label className="form-check-label" htmlFor="receber-itens-pendente">
                <strong>Pagamento pendente</strong> — pago depois
              </label>
            </div>
            <p className="small text-warning-emphasis mt-2 mb-0">
              Selecionados: <strong>R$ {formatMoeda(totalSelReceber)}</strong>
            </p>
          </fieldset>
          <button
            type="button"
            className="analytics-btn analytics-btn--primary analytics-btn--sm"
            disabled={busy}
            onClick={() => void confirmarRecebimento()}
          >
            <i className="bi bi-check-lg" aria-hidden="true" /> Confirmar recebimento
          </button>
        </div>
      ) : null}

      {pagPendentes.length > 0 ? (
        <div className="forn-receber-itens-bar forn-pagar-itens-bar mt-3">
          <p className="mb-0 small text-muted flex-grow-1">
            Itens já recebidos com pagamento pendente — selecionados:{" "}
            <strong>R$ {formatMoeda(totalSelPagar)}</strong>
          </p>
          <button
            type="button"
            className="analytics-btn analytics-btn--primary analytics-btn--sm"
            disabled={busy}
            onClick={() => void marcarPago()}
          >
            <i className="bi bi-cash-coin" aria-hidden="true" /> Marcar como pago
          </button>
        </div>
      ) : null}

      {entrega.observacao ? (
        <p className="small mb-0 mt-2">
          <strong>Obs.:</strong> {entrega.observacao}
        </p>
      ) : null}
      <input type="hidden" value={statusTab} readOnly aria-hidden />
    </section>
  );
}

function FornecedorNotaPrint({ notaId }: { notaId: number }) {
  const [entrega, setEntrega] = useState<EntregaDetalhe | null>(null);

  useEffect(() => {
    void fetchEntregaDetalhe(notaId).then(setEntrega);
  }, [notaId]);

  useEffect(() => {
    if (entrega) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [entrega]);

  if (!entrega) return <p className="p-4">Carregando nota…</p>;

  return (
    <div className="p-4 bg-white text-dark">
      <h1 className="h4">{entregaNumeroNota(entrega.id)}</h1>
      <p className="mb-1">
        <strong>{fornecedorRotuloEmpresa(entrega)}</strong>
      </p>
      <p className="small text-muted mb-3">{formatDataHora(entrega.enviado_em)}</p>
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Material</th>
            <th className="text-end">Metros</th>
            <th className="text-end">R$/m</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {entrega.itens.map((i) => (
            <tr key={i.id}>
              <td>{i.material_nome}</td>
              <td className="text-end">{formatMoeda(i.metros)}</td>
              <td className="text-end">{formatMoeda(i.valor_unitario)}</td>
              <td className="text-end">{formatMoeda(i.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-end">
              <strong>Total</strong>
            </td>
            <td className="text-end">
              <strong>R$ {formatMoeda(entrega.total_geral)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function FornecedoresPage() {
  const navigate = useNavigate({ from: FornecedoresRoute.fullPath });
  const search = FornecedoresRoute.useSearch();
  const status = search.status ?? "enviado";
  const verId = search.ver ?? 0;
  const controleId = search.controle ?? 0;
  const notaId = search.nota ?? 0;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [pendentesTotal, setPendentesTotal] = useState(0);
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([]);
  const [entregas, setEntregas] = useState<EntregaListaRow[]>([]);
  const [entregaDetalhe, setEntregaDetalhe] = useState<EntregaDetalhe | null>(null);
  const [controle, setControle] = useState<FornecedorControlePainel | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalForn, setModalForn] = useState<FornecedorRow | null>(null);

  useEffect(() => {
    document.body.classList.add("dashboard-page--fornecedores");
    return () => document.body.classList.remove("dashboard-page--fornecedores");
  }, []);

  const load = useCallback(async () => {
    if (notaId > 0) return;
    setLoading(true);
    setErro("");
    try {
      if (verId > 0) {
        const entrega = await fetchEntregaDetalhe(verId);
        setEntregaDetalhe(entrega);
        setEntregas([]);
        setControle(null);
        const base = await fetchFornecedoresPainel({ status });
        setPendentesTotal(base.pendentes_total);
        setFornecedores(base.fornecedores);
        return;
      }

      const data = await fetchFornecedoresPainel({
        status: status === "todas" ? "todas" : status,
        controle: controleId > 0 ? controleId : undefined,
      });
      setPendentesTotal(data.pendentes_total);
      setFornecedores(data.fornecedores);
      setEntregas(data.entregas ?? []);
      setControle(data.controle ?? null);
      setEntregaDetalhe(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [status, verId, controleId, notaId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function salvarFornecedor(dados: FornecedorInput, id?: number) {
    const res = await postFornecedoresAction(
      id ? { action: "editar", id, dados } : { action: "cadastrar", dados },
    );
    if (!res.ok) throw new Error(res.message);
    toast(res.message);
    void load();
  }

  async function excluirFornecedor(id: number) {
    if (!window.confirm("Excluir esta empresa fornecedora?")) return;
    const res = await postFornecedoresAction({ action: "excluir", id });
    toast(res.message, res.ok ? "success" : "danger");
    if (res.ok) void load();
  }

  async function excluirEntrega(id: number) {
    if (
      !window.confirm(
        "Excluir esta nota de entrega? Compras lançadas ao receber também serão removidas.",
      )
    ) {
      return;
    }
    const res = await postFornecedoresAction({ action: "excluir_entrega", entrega_id: id });
    toast(res.message, res.ok ? "success" : "danger");
    if (res.ok) {
      void navigate({ search: { status } });
    }
  }

  if (notaId > 0) {
    return <FornecedorNotaPrint notaId={notaId} />;
  }

  const title = controle
    ? fornecedorRotulo(controle.fornecedor)
    : "Entregas de fornecedores";
  const subtitle = controle
    ? "Custos, orçamentos por cliente e margem com este fornecedor."
    : "Confira o que cada fornecedor enviou, dê o visto de recebido e imprima a nota.";

  return (
    <div className="analytics-page dash-form-page--pro dashboard-page--fornecedores">
      <DashPageHero
        title={title}
        subtitle={subtitle}
        iconClass="bi-truck"
        accent="fornecedores"
        layout="header"
        showNovaVisita={false}
        cta={undefined}
      />

      <div className="dash-page-body dash-page-body--with-header">
        <div className="dash-fornecedor-page">
          {erro ? (
            <div className="alert alert-danger" role="alert">
              {erro}
            </div>
          ) : null}
          {loading ? <p className="text-muted py-3">Carregando…</p> : null}

          {!loading && controle && controleId > 0 ? (
            <FornecedorControleView
              controleId={controleId}
              data={controle}
              status={status}
              onReload={() => void load()}
              onEditar={() => {
                setModalForn(controle.fornecedor);
                setModalOpen(true);
              }}
              toast={toast}
            />
          ) : null}

          {!loading && !controleId && (
            <section id="entregas-inbox" className="forn-entregas-inbox mb-4">
              {pendentesTotal > 0 && !verId ? (
                <div className="dash-entregas-alerta dash-entregas-alerta--destaque mb-3" role="status">
                  <div className="dash-entregas-alerta__text">
                    <i className="bi bi-bell-fill" aria-hidden="true" />
                    <strong>{pendentesTotal}</strong>{" "}
                    {pendentesTotal === 1 ? "nota aguardando" : "notas aguardando"} seu visto de
                    recebido.
                  </div>
                </div>
              ) : null}

              {!verId ? (
                <div className="forn-entrega-filtros mb-3" role="tablist" aria-label="Filtrar entregas">
                  <Link
                    to="/painel/fornecedores"
                    search={{ status: "enviado" }}
                    className={`analytics-btn analytics-btn--sm${status === "enviado" ? " analytics-btn--primary" : " analytics-btn--outline"}`}
                  >
                    <i className="bi bi-inbox" aria-hidden="true" /> Aguardando visto
                    {pendentesTotal > 0 ? (
                      <span className="forn-entrega-badge forn-entrega-badge--pend ms-1">
                        {pendentesTotal}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    to="/painel/fornecedores"
                    search={{ status: "recebido" }}
                    className={`analytics-btn analytics-btn--sm${status === "recebido" ? " analytics-btn--primary" : " analytics-btn--outline"}`}
                  >
                    <i className="bi bi-check2-circle" aria-hidden="true" /> Recebidas
                  </Link>
                  <Link
                    to="/painel/fornecedores"
                    search={{ status: "todas" }}
                    className={`analytics-btn analytics-btn--sm${status === "todas" ? " analytics-btn--primary" : " analytics-btn--outline"}`}
                  >
                    Todas
                  </Link>
                </div>
              ) : null}

              {verId > 0 && entregaDetalhe ? (
                <EntregaDetalheView
                  entrega={entregaDetalhe}
                  statusTab={status}
                  onReload={() => void load()}
                  onVoltar={() => void navigate({ search: { status } })}
                />
              ) : null}

              {!verId && entregas.length === 0 ? (
                <div className="inv-empty-state mb-4" role="status">
                  <div className="inv-empty-state__icon inv-empty-state__icon--fornecedores">
                    <i className="bi bi-inbox" aria-hidden="true" />
                  </div>
                  <h2 className="inv-empty-state__title">Nenhuma entrega por aqui</h2>
                  <p className="inv-empty-state__text">
                    {status === "enviado" ? (
                      <>
                        Nenhuma nota aguardando visto agora. As notas ficam <strong>nesta área</strong>{" "}
                        (acima de «Empresas cadastradas»), não na lista de empresas.
                      </>
                    ) : status === "recebido" ? (
                      "Ainda não há entregas marcadas como recebidas."
                    ) : (
                      <>
                        Nenhuma entrega registrada no sistema ainda. O fornecedor precisa clicar em{" "}
                        <strong>Confirmar e enviar</strong> em Minhas entregas.
                      </>
                    )}
                  </p>
                  {status === "enviado" ? (
                    <div className="inv-empty-state__actions">
                      <Link
                        to="/painel/fornecedores"
                        search={{ status: "todas" }}
                        className="analytics-btn analytics-btn--outline analytics-btn--sm"
                      >
                        <i className="bi bi-list-ul" aria-hidden="true" /> Ver todas
                      </Link>
                      <Link
                        to="/painel/fornecedores"
                        search={{ status: "recebido" }}
                        className="analytics-btn analytics-btn--primary analytics-btn--sm"
                      >
                        <i className="bi bi-check2-circle" aria-hidden="true" /> Ver recebidas
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!verId && entregas.length > 0 ? (
                <>
                  <div className="inv-list-toolbar mb-3">
                    <div className="inv-list-toolbar__stats">
                      <span className="inv-list-stat">
                        <strong>{entregas.length}</strong> nota(s)
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-data-desktop inv-table-shell mb-4">
                    <div className="table-responsive inv-table-scroll inv-table-scroll--fit">
                      <table className="table inv-data-table inv-data-table--balanced align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Nota</th>
                            <th>Fornecedor / empresa</th>
                            <th>Enviado por</th>
                            <th>Data</th>
                            <th className="text-end">Itens</th>
                            <th className="text-end">Total</th>
                            <th>Recebimento</th>
                            <th>Pagamento</th>
                            <th className="inv-col-actions">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entregas.map((ent) => (
                            <tr
                              key={ent.id}
                              className={`inv-data-row${ent.status === "enviado" || ent.status === "parcial" ? " forn-entrega-row--pend" : ""}`}
                            >
                              <td>
                                <strong>{entregaNumeroNota(ent.id)}</strong>
                              </td>
                              <td>
                                <span className="inv-cliente-nome d-block">
                                  {fornecedorRotuloEmpresa(ent)}
                                </span>
                              </td>
                              <td>{ent.usuario_nome?.trim() || "—"}</td>
                              <td className="text-nowrap">
                                <small>{formatDataHora(ent.enviado_em)}</small>
                              </td>
                              <td className="text-end">{ent.qtd_itens}</td>
                              <td className="text-end">R$ {formatMoeda(ent.total_valor)}</td>
                              <td>
                                {badgeRecebimento(
                                  ent.status,
                                  ent.qtd_itens,
                                  ent.qtd_itens_recebidos,
                                )}
                              </td>
                              <td>{badgePagamento(ent.status, ent.pagamento_status)}</td>
                              <td className="inv-col-actions">
                                <div className="inv-action-group inv-action-group--row-end">
                                  <Link
                                    to="/painel/fornecedores"
                                    search={{ ver: ent.id, status }}
                                    className="inv-action-btn inv-action-btn--secondary"
                                    title="Ver itens"
                                  >
                                    <i className="bi bi-eye" aria-hidden="true" />
                                  </Link>
                                  <Link
                                    to="/painel/fornecedores"
                                    search={{ nota: ent.id }}
                                    target="_blank"
                                    className="inv-action-btn inv-action-btn--secondary"
                                    title="Imprimir"
                                  >
                                    <i className="bi bi-printer" aria-hidden="true" />
                                  </Link>
                                  {ent.status !== "recebido" ? (
                                    <Link
                                      to="/painel/fornecedores"
                                      search={{ ver: ent.id, status }}
                                      className="inv-action-btn inv-action-btn--primary"
                                      title="Dar visto"
                                    >
                                      <i className="bi bi-check-lg" aria-hidden="true" />
                                    </Link>
                                  ) : null}
                                  <Link
                                    to="/painel/fornecedores"
                                    search={{ controle: ent.fornecedor_id }}
                                    className="inv-action-btn inv-action-btn--muted"
                                    title="Financeiro"
                                  >
                                    <i className="bi bi-graph-up" aria-hidden="true" />
                                  </Link>
                                  <button
                                    type="button"
                                    className="inv-action-btn inv-action-btn--muted"
                                    title="Excluir nota"
                                    onClick={() => void excluirEntrega(ent.id)}
                                  >
                                    <i className="bi bi-trash" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          )}

          {!loading && !controleId && !verId ? (
            <>
              <details className="dash-form-card dash-form-card--compact dash-forn-collapse mb-3">
                <summary className="dash-forn-collapse__summary">
                  <i className="bi bi-building-add" aria-hidden="true" />
                  Cadastrar empresa fornecedora
                  <span className="dash-forn-collapse__hint">
                    opcional — vínculo com usuário em Usuários
                  </span>
                </summary>
                <div className="dash-forn-collapse__body">
                  <p className="small text-muted mb-2">
                    Use o formulário completo com busca de CNPJ e CEP:
                  </p>
                  <button
                    type="button"
                    className="analytics-btn analytics-btn--primary analytics-btn--sm"
                    onClick={() => {
                      setModalForn(null);
                      setModalOpen(true);
                    }}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" /> Abrir cadastro
                  </button>
                </div>
              </details>

              <details className="dash-form-card dash-forn-collapse mb-3" open>
                <summary className="dash-forn-collapse__summary">
                  <i className="bi bi-building" aria-hidden="true" />
                  Empresas cadastradas ({fornecedores.length})
                  <span className="dash-forn-collapse__hint">editar, excluir ou ver financeiro</span>
                </summary>
                <div className="dash-forn-collapse__body pt-2">
                  {fornecedores.length === 0 ? (
                    <p className="inv-detail-empty mb-0">
                      Nenhuma empresa cadastrada. Use o formulário acima ou vincule em Usuários.
                    </p>
                  ) : (
                    <div className="dashboard-data-desktop inv-table-shell">
                      <div className="table-responsive inv-table-scroll inv-table-scroll--fit">
                        <table className="table inv-data-table inv-data-table--balanced align-middle mb-0">
                          <thead>
                            <tr>
                              <th className="inv-col-id">#</th>
                              <th>Empresa</th>
                              <th>CNPJ</th>
                              <th>Contato</th>
                              <th>Cidade</th>
                              <th className="inv-col-actions">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fornecedores.map((f) => {
                              const cidadeUf = [f.cidade, f.uf].filter(Boolean).join(" / ");
                              return (
                                <tr key={f.id} className="inv-data-row">
                                  <td className="inv-col-id">
                                    <span className="inv-id-badge">#{f.id}</span>
                                  </td>
                                  <td>
                                    <span className="inv-cliente-nome d-block">{f.razao_social}</span>
                                    {f.nome_fantasia ? (
                                      <small className="text-muted d-block">{f.nome_fantasia}</small>
                                    ) : null}
                                  </td>
                                  <td>{formatCnpjExib(f.cnpj)}</td>
                                  <td>
                                    {f.contato_nome ? (
                                      <span className="d-block">{f.contato_nome}</span>
                                    ) : null}
                                    {f.telefone ? (
                                      <TelefoneCell telefone={f.telefone} />
                                    ) : null}
                                    {f.email ? (
                                      <span className="inv-telefone-text d-block">{f.email}</span>
                                    ) : null}
                                    {!f.contato_nome && !f.telefone && !f.email ? (
                                      <span className="inv-detail-empty">—</span>
                                    ) : null}
                                  </td>
                                  <td>{cidadeUf || "—"}</td>
                                  <td className="inv-col-actions">
                                    <div className="inv-action-group inv-action-group--row-end">
                                      <button
                                        type="button"
                                        className="inv-action-btn inv-action-btn--secondary"
                                        title="Editar"
                                        onClick={() => {
                                          setModalForn(f);
                                          setModalOpen(true);
                                        }}
                                      >
                                        <i className="bi bi-pencil-square" aria-hidden="true" />
                                      </button>
                                      <Link
                                        to="/painel/fornecedores"
                                        search={{ controle: f.id }}
                                        className="inv-action-btn inv-action-btn--muted"
                                        title="Financeiro"
                                      >
                                        <i className="bi bi-graph-up" aria-hidden="true" />
                                      </Link>
                                      <button
                                        type="button"
                                        className="inv-action-btn inv-action-btn--muted"
                                        title="Excluir"
                                        onClick={() => void excluirFornecedor(f.id)}
                                      >
                                        <i className="bi bi-trash" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </>
          ) : null}
        </div>
      </div>

      <ModalFornecedor
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalForn(null);
        }}
        fornecedor={modalForn}
        onSave={salvarFornecedor}
      />
    </div>
  );
}
