import { Link } from "@tanstack/react-router";
import { Fragment, useCallback, useMemo, useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import type {
  CompraFornecedorRow,
  FornecedorControlePainel,
} from "@/lib/fornecedor-controle.server";
import { EnderecoLink, TelefoneCell } from "@/components/admin/inventario-ui";
import { joinEnderecoParts } from "@/lib/inventario-format";
import { postFornecedoresAction } from "@/lib/fornecedores-client";
import {
  entregaNumeroNota,
  formatCnpjExib,
  formatDataHora,
  formatMoeda,
} from "@/lib/fornecedores-display";

export type { FornecedorControlePainel };

type Props = {
  controleId: number;
  data: FornecedorControlePainel;
  status: string;
  onReload: () => void;
  onEditar: () => void;
  toast: (msg: string, tipo?: "success" | "danger") => void;
};

function parseDecimalInput(raw: string): number {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatCompraData(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FornecedorControleView({
  controleId,
  data,
  status,
  onReload,
  onEditar,
  toast,
}: Props) {
  const { fornecedor: f, resumo, compras, orcamentos, itens, materiais, pendentes, entregas_pendentes } =
    data;
  const enderecoForn = joinEnderecoParts({
    endereco: f.endereco,
    numero: f.numero,
    bairro: f.bairro,
    cep: f.cep,
  });

  const [materialId, setMaterialId] = useState("");
  const [metros, setMetros] = useState("1");
  const [valorUnit, setValorUnit] = useState("");
  const [obs, setObs] = useState("");
  const [atualizarCusto, setAtualizarCusto] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [excluirCompra, setExcluirCompra] = useState<CompraFornecedorRow | null>(null);
  const [excluirLoading, setExcluirLoading] = useState(false);

  const [devolverOpen, setDevolverOpen] = useState(false);
  const [devolverCompra, setDevolverCompra] = useState<CompraFornecedorRow | null>(null);
  const [metrosDevolver, setMetrosDevolver] = useState("");
  const [motivoDevolver, setMotivoDevolver] = useState("");
  const [devolverLoading, setDevolverLoading] = useState(false);

  const totalPreview = useMemo(() => {
    const m = parseDecimalInput(metros);
    const v = parseDecimalInput(valorUnit);
    return m * v;
  }, [metros, valorUnit]);

  const onMaterialChange = useCallback(
    (id: string) => {
      setMaterialId(id);
      const mat = materiais.find((m) => String(m.id) === id);
      if (mat && mat.valor_custo > 0) {
        setValorUnit(formatMoeda(mat.valor_custo));
      }
    },
    [materiais],
  );

  async function lancarCompra(e: React.FormEvent) {
    e.preventDefault();
    const mid = Number.parseInt(materialId, 10);
    if (!mid) {
      toast("Selecione o material.", "danger");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postFornecedoresAction({
        action: "lancar_compra",
        fornecedor_id: controleId,
        material_id: mid,
        metros,
        valor_unitario: valorUnit,
        observacao: obs,
        atualizar_custo_material: atualizarCusto,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) {
        setObs("");
        setMetros("1");
        setValorUnit("");
        setMaterialId("");
        onReload();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao lançar.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmarExcluir() {
    if (!excluirCompra) return;
    setExcluirLoading(true);
    try {
      const res = await postFornecedoresAction({
        action: "excluir_compra",
        compra_id: excluirCompra.id,
        fornecedor_id: controleId,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) {
        setExcluirCompra(null);
        onReload();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao excluir.", "danger");
    } finally {
      setExcluirLoading(false);
    }
  }

  async function enviarDevolucao(e: React.FormEvent) {
    e.preventDefault();
    if (!devolverCompra) return;
    setDevolverLoading(true);
    try {
      const res = await postFornecedoresAction({
        action: "devolver_compra",
        compra_id: devolverCompra.id,
        fornecedor_id: controleId,
        metros_devolver: metrosDevolver,
        motivo: motivoDevolver,
      });
      toast(res.message, res.ok ? "success" : "danger");
      if (res.ok) {
        setDevolverOpen(false);
        setDevolverCompra(null);
        onReload();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro na devolução.", "danger");
    } finally {
      setDevolverLoading(false);
    }
  }

  function abrirDevolver(compra: CompraFornecedorRow) {
    setDevolverCompra(compra);
    setMetrosDevolver(formatMoeda(compra.metros_disponivel_devolver));
    setMotivoDevolver("");
    setDevolverOpen(true);
  }

  return (
    <div className="dash-fornecedor-page dash-fornecedor-page--controle">
      {pendentes > 0 ? (
        <div className="dash-entregas-alerta mb-3" role="status">
          <div className="dash-entregas-alerta__text">
            <strong>{pendentes} entrega(s)</strong> deste fornecedor aguardando seu visto.
          </div>
          <Link
            to="/painel/fornecedores"
            search={{ status: "enviado" }}
            className="analytics-btn analytics-btn--primary analytics-btn--sm"
          >
            <i className="bi bi-inbox" aria-hidden="true" /> Ver entregas gerais
          </Link>
        </div>
      ) : null}

      <div className="mb-3">
        <Link
          to="/painel/fornecedores"
          search={{ status }}
          className="analytics-btn analytics-btn--outline analytics-btn--sm"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar às entregas
        </Link>
        <button
          type="button"
          className="analytics-btn analytics-btn--primary analytics-btn--sm ms-2"
          onClick={onEditar}
        >
          <i className="bi bi-pencil-square" aria-hidden="true" /> Editar cadastro
        </button>
      </div>

      <details className="dash-form-card dash-forn-collapse mb-3">
        <summary className="dash-forn-collapse__summary">
          <i className="bi bi-building" aria-hidden="true" />
          Dados da empresa
          <span className="dash-forn-collapse__hint">clique para expandir ou minimizar</span>
        </summary>
        <div className="dash-forn-collapse__body pt-2">
          <div className="row g-2 small">
            <div className="col-md-6">
              <strong>Razão social:</strong> {f.razao_social}
            </div>
            <div className="col-md-6">
              <strong>CNPJ:</strong> {formatCnpjExib(f.cnpj)}
            </div>
            {f.telefone?.trim() ? (
              <div className="col-md-4">
                <strong>Telefone:</strong> <TelefoneCell telefone={f.telefone} />
              </div>
            ) : null}
            {f.email?.trim() ? (
              <div className="col-md-8">
                <strong>E-mail:</strong> {f.email}
              </div>
            ) : null}
            {enderecoForn ? (
              <div className="col-12">
                <strong className="d-block mb-1">Endereço:</strong>
                <EnderecoLink endereco={enderecoForn} compact />
              </div>
            ) : null}
          </div>
        </div>
      </details>

      <section className="dash-form-card mb-3">
        <h2 className="dash-form-block__title mb-3">
          <i className="bi bi-cash-stack" aria-hidden="true" /> Controle financeiro
        </h2>
        <div className="row g-3 mb-3 forn-finance-summary">
          <div className="col-6 col-md-3">
            <div className="forn-stat-card forn-stat-card--custo">
              <span className="forn-stat-card__label">Custo total</span>
              <strong className="forn-stat-card__value">R$ {formatMoeda(resumo.total_custo)}</strong>
              {resumo.total_custo_compras > 0 || resumo.total_custo_orcamentos > 0 ? (
                <span className="forn-stat-card__sub">
                  Orç.: R$ {formatMoeda(resumo.total_custo_orcamentos)} · Compras: R${" "}
                  {formatMoeda(resumo.total_custo_compras)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="forn-stat-card forn-stat-card--venda">
              <span className="forn-stat-card__label">Venda (itens dele)</span>
              <strong className="forn-stat-card__value">R$ {formatMoeda(resumo.total_venda)}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="forn-stat-card forn-stat-card--margem">
              <span className="forn-stat-card__label">Margem</span>
              <strong className="forn-stat-card__value">R$ {formatMoeda(resumo.margem)}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="forn-stat-card">
              <span className="forn-stat-card__label">Orçamentos</span>
              <strong className="forn-stat-card__value">{resumo.qtd_orcamentos}</strong>
              <span className="forn-stat-card__sub">{resumo.qtd_itens} itens</span>
            </div>
          </div>
        </div>

        <section className="dash-form-block forn-lancar-compra mb-4">
          <h3 className="dash-form-block__title h6 mb-3">
            <i className="bi bi-cart-plus" aria-hidden="true" /> Lançar compra deste fornecedor
          </h3>
          {materiais.length === 0 ? (
            <p className="inv-detail-empty mb-0">
              Cadastre materiais em <strong>Administração → Materiais</strong> para lançar compras
              aqui.
            </p>
          ) : (
            <form className="dash-form" onSubmit={lancarCompra}>
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label" htmlFor="compra-material-id">
                    Material da empresa
                  </label>
                  <select
                    className="form-select"
                    id="compra-material-id"
                    required
                    value={materialId}
                    onChange={(e) => onMaterialChange(e.target.value)}
                  >
                    <option value="">Selecione o material…</option>
                    {materiais.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.material}
                        {mat.liberado ? " · liberado" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label" htmlFor="compra-metros">
                    Metros
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="compra-metros"
                    inputMode="decimal"
                    required
                    value={metros}
                    onChange={(e) => setMetros(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label" htmlFor="compra-valor-unit">
                    R$ / metro (pago)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="compra-valor-unit"
                    placeholder="0,00"
                    inputMode="decimal"
                    required
                    value={valorUnit}
                    onChange={(e) => setValorUnit(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <div className="forn-compra-total-preview small text-muted mb-1">
                    Total: <strong>R$ {formatMoeda(totalPreview)}</strong>
                  </div>
                  <button
                    type="submit"
                    className="analytics-btn analytics-btn--primary analytics-btn--sm w-100"
                    disabled={submitting}
                  >
                    <i className="bi bi-plus-circle" aria-hidden="true" />{" "}
                    {submitting ? "Lançando…" : "Lançar compra"}
                  </button>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="compra-obs">
                    Observação
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="compra-obs"
                    maxLength={255}
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <div className="form-check mt-md-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="compra-atualizar-custo"
                      checked={atualizarCusto}
                      onChange={(e) => setAtualizarCusto(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="compra-atualizar-custo">
                      Atualizar custo padrão do material
                    </label>
                  </div>
                </div>
              </div>
            </form>
          )}
        </section>

        {compras.length > 0 ? (
          <div className="mb-4">
            <h3 className="dash-form-block__title h6 mb-2">
              <i className="bi bi-receipt" aria-hidden="true" /> Compras lançadas ({compras.length})
            </h3>
            <div className="inv-table-shell">
              <div className="table-responsive">
                <table className="table inv-data-table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Material</th>
                      <th className="text-end">Comprado</th>
                      <th className="text-end">Devolvido</th>
                      <th className="text-end">Entregue</th>
                      <th className="text-end">R$/metro</th>
                      <th className="text-end">Total pago</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((compra) => {
                      const podeDevolver = compra.metros_efetivos > 0;
                      return (
                        <Fragment key={compra.id}>
                          <tr className="inv-data-row">
                            <td className="text-nowrap">
                              <small>{formatCompraData(compra.criado_em)}</small>
                            </td>
                            <td>{compra.material_nome}</td>
                            <td className="text-end">{formatMoeda(compra.metros)}</td>
                            <td className="text-end">
                              {compra.metros_devolvidos > 0 ? (
                                <span
                                  className="forn-compra-devolvido"
                                  title="Metros devolvidos ao fornecedor"
                                >
                                  {formatMoeda(compra.metros_devolvidos)}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-end">
                              <strong>{formatMoeda(compra.metros_efetivos)}</strong>
                            </td>
                            <td className="text-end">R$ {formatMoeda(compra.valor_unitario)}</td>
                            <td className="text-end">
                              <strong>R$ {formatMoeda(compra.total_pago)}</strong>
                              {compra.metros_devolvidos > 0 ? (
                                <>
                                  <br />
                                  <small className="text-muted text-decoration-line-through">
                                    R$ {formatMoeda(compra.total_original)}
                                  </small>
                                </>
                              ) : null}
                            </td>
                            <td className="text-end">
                              <div className="inv-action-group inv-action-group--row-end">
                                {podeDevolver ? (
                                  <button
                                    type="button"
                                    className="inv-action-btn inv-action-btn--secondary"
                                    title="Registrar devolução (defeito, etc.)"
                                    onClick={() => abrirDevolver(compra)}
                                  >
                                    <i className="bi bi-arrow-return-left" aria-hidden="true" />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="inv-action-btn inv-action-btn--muted"
                                  title="Remover lançamento"
                                  onClick={() => setExcluirCompra(compra)}
                                >
                                  <i className="bi bi-trash" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {compra.observacao?.trim() ? (
                            <tr key={`${compra.id}-obs`}>
                              <td colSpan={8} className="pt-0 border-0">
                                <small className="text-muted">Obs.: {compra.observacao}</small>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {orcamentos.length === 0 ? (
          <p className="inv-detail-empty mb-0">
            Nenhum orçamento vinculado a este fornecedor ainda. Ao editar um orçamento em{" "}
            <strong>Orçamentado</strong> ou <strong>Visitas</strong>, selecione este fornecedor em
            cada material — ou use o formulário acima para registrar compras diretas.
          </p>
        ) : (
          <>
            <div className="inv-table-shell">
              <div className="table-responsive">
                <table className="table inv-data-table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Cliente / #</th>
                      <th>Status</th>
                      <th className="text-end">Custo</th>
                      <th className="text-end">Venda</th>
                      <th className="text-end">Margem</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orcamentos.map((orc) => {
                      const margemOrc = orc.total_venda_forn - orc.total_custo;
                      return (
                        <tr key={orc.inventario_id} className="inv-data-row">
                          <td>
                            <span className="inv-cliente-nome d-block">{orc.cliente}</span>
                            <small className="text-muted">#{orc.inventario_id}</small>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{orc.status}</span>
                          </td>
                          <td className="text-end">R$ {formatMoeda(orc.total_custo)}</td>
                          <td className="text-end">R$ {formatMoeda(orc.total_venda_forn)}</td>
                          <td
                            className={`text-end ${margemOrc >= 0 ? "text-success" : "text-danger"}`}
                          >
                            R$ {formatMoeda(margemOrc)}
                          </td>
                          <td className="text-end">
                            <Link
                              to="/painel/orcamentado"
                              className="analytics-btn analytics-btn--outline analytics-btn--sm"
                              title="Abrir orçamentado"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {itens.length > 0 ? (
              <details className="mt-3">
                <summary className="dash-form-block__title mb-0" style={{ cursor: "pointer" }}>
                  <i className="bi bi-list-ul" aria-hidden="true" /> Detalhar materiais comprados
                </summary>
                <div className="table-responsive mt-2">
                  <table className="table table-sm dash-orc-table mb-0">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Material</th>
                        <th className="text-end">Metros</th>
                        <th className="text-end">Custo</th>
                        <th className="text-end">Venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it, idx) => (
                        <tr key={`${it.inventario_id}-${it.material}-${idx}`}>
                          <td>
                            {it.cliente}{" "}
                            <small className="text-muted">#{it.inventario_id}</small>
                          </td>
                          <td>{it.material}</td>
                          <td className="text-end">{formatMoeda(it.metros)}</td>
                          <td className="text-end">R$ {formatMoeda(it.total_custo)}</td>
                          <td className="text-end">R$ {formatMoeda(it.total_venda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </>
        )}
      </section>

      {entregas_pendentes.length > 0 ? (
        <section className="dash-form-card mb-3">
          <h3 className="dash-form-block__title h6 mb-2">
            <i className="bi bi-inbox" aria-hidden="true" /> Aguardando visto (este fornecedor)
          </h3>
          <div className="inv-table-shell">
            <div className="table-responsive">
              <table className="table inv-data-table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nota</th>
                    <th>Data</th>
                    <th className="text-end">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entregas_pendentes.map((ent) => (
                    <tr key={ent.id}>
                      <td>
                        <strong>{entregaNumeroNota(ent.id)}</strong>
                      </td>
                      <td>
                        <small>{formatDataHora(ent.enviado_em)}</small>
                      </td>
                      <td className="text-end">R$ {formatMoeda(ent.total_valor)}</td>
                      <td className="text-end">
                        <Link
                          to="/painel/fornecedores"
                          search={{ ver: ent.id, status: "enviado" }}
                          className="analytics-btn analytics-btn--primary analytics-btn--sm"
                        >
                          Dar visto
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <DashConfirmModal
        open={excluirCompra !== null}
        options={
          excluirCompra
            ? {
                title: "Remover lançamento",
                message: "Deseja remover este lançamento de compra?",
                confirmText: "Remover",
                variant: "danger",
                icon: "bi-trash",
              }
            : null
        }
        loading={excluirLoading}
        onConfirm={() => void confirmarExcluir()}
        onCancel={() => setExcluirCompra(null)}
      />

      <AdminModal open={devolverOpen} onClose={() => setDevolverOpen(false)}>
        <div className="modal-content">
          <form onSubmit={enviarDevolucao}>
            <div className="modal-header">
              <h5 className="modal-title">Registrar devolução</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Fechar"
                onClick={() => setDevolverOpen(false)}
              />
            </div>
            <div className="modal-body">
              {devolverCompra ? (
                <>
                  <p className="small text-muted mb-2">{devolverCompra.material_nome}</p>
                  <p className="small mb-3">
                    Comprado: <strong>{formatMoeda(devolverCompra.metros)} m</strong>
                    {devolverCompra.metros_devolvidos > 0 ? (
                      <>
                        {" "}
                        · Já devolvido:{" "}
                        <strong>{formatMoeda(devolverCompra.metros_devolvidos)} m</strong>
                      </>
                    ) : null}
                    <br />
                    Disponível para devolver:{" "}
                    <strong>{formatMoeda(devolverCompra.metros_disponivel_devolver)} m</strong>
                  </p>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="devolver-metros">
                      Metros a devolver
                    </label>
                    <input
                      id="devolver-metros"
                      type="text"
                      className="form-control"
                      inputMode="decimal"
                      required
                      value={metrosDevolver}
                      onChange={(e) => setMetrosDevolver(e.target.value)}
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label" htmlFor="devolver-motivo">
                      Motivo <span className="text-muted">(opcional)</span>
                    </label>
                    <input
                      id="devolver-motivo"
                      type="text"
                      className="form-control"
                      maxLength={255}
                      value={motivoDevolver}
                      onChange={(e) => setMotivoDevolver(e.target.value)}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="analytics-btn analytics-btn--outline analytics-btn--sm"
                onClick={() => setDevolverOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="analytics-btn analytics-btn--primary analytics-btn--sm"
                disabled={devolverLoading}
              >
                {devolverLoading ? "Salvando…" : "Registrar devolução"}
              </button>
            </div>
          </form>
        </div>
      </AdminModal>
    </div>
  );
}
