import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminModal } from "@/components/admin/modals/AdminModal";
import { useOrcamentoForm } from "@/hooks/use-orcamento-form";
import { bloquearTeclaNaoNumerica } from "@/lib/orcamento.server";
import {
  fetchMateriais,
  fetchOrcamentoInventario,
  salvarOrcamentoEdicao,
  salvarOrcamentoNovo,
  type AgendamentoItem,
} from "@/lib/admin-api";

type Props = {
  open: boolean;
  onClose: () => void;
  inventarioId: number | null;
  clienteNome?: string;
  cpfInicial?: string;
  mode: "novo" | "editar";
  onSaved: (item: AgendamentoItem, extra?: { nome: string; telefone: string; valor: number }) => void;
};

export function ModalOrcamento({
  open,
  onClose,
  inventarioId,
  clienteNome,
  cpfInicial = "",
  mode,
  onSaved,
}: Props) {
  const [materiais, setMateriais] = useState<Awaited<ReturnType<typeof fetchMateriais>>>([]);
  const [materiaisLoading, setMateriaisLoading] = useState(false);
  const [materiaisErro, setMateriaisErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const form = useOrcamentoForm(materiais);

  useEffect(() => {
    if (!open) return;
    setMateriaisLoading(true);
    setMateriaisErro("");
    void fetchMateriais()
      .then((lista) => {
        setMateriais(lista);
        if (lista.length === 0) {
          setMateriaisErro("Nenhum material cadastrado. Cadastre em Materiais no menu.");
        }
      })
      .catch((e) => {
        setMateriais([]);
        setMateriaisErro(e instanceof Error ? e.message : "Não foi possível carregar materiais.");
      })
      .finally(() => setMateriaisLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !inventarioId) return;
    form.resetForm();
    setError("");
    if (mode === "novo") {
      form.setCpfCnpj(cpfInicial.replace(/\D/g, "") === "00000000000" ? "" : cpfInicial);
      return;
    }
    setLoading(true);
    fetchOrcamentoInventario(inventarioId)
      .then((d) => form.loadExisting(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [open, inventarioId, mode, cpfInicial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inventarioId) return;
    if (form.partData.length === 0) {
      setError("Adicione pelo menos um material.");
      return;
    }
    if (!form.formaPagamento && mode === "novo") {
      setError("Selecione a forma de pagamento.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = form.buildPayload();
      if (mode === "novo") {
        const res = await salvarOrcamentoNovo(inventarioId, payload);
        onSaved(res.item, { nome: res.nome, telefone: res.telefone, valor: res.valor });
      } else {
        const res = await salvarOrcamentoEdicao(inventarioId, payload);
        onSaved(res.item, { valor: res.valor, nome: res.item.nome, telefone: res.item.telefone });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const titulo = mode === "novo" ? "Novo orçamento" : "Editar orçamento";
  const mostrarDescontos = mode === "editar";

  return (
    <AdminModal open={open} onClose={onClose} dialogClass="visitas-orc-modal__dialog modal-lg">
      <div className="modal-content visitas-orc-modal__content">
        <div className="modal-header visitas-orc-modal__header flex-shrink-0">
          <div className="visitas-orc-modal__head">
            <span className="visitas-orc-modal__head-icon" aria-hidden="true">
              <i className="bi bi-clipboard-check" />
            </span>
            <div>
              <h4 className="modal-title visitas-orc-modal__title mb-0">{titulo}</h4>
              <p className="visitas-orc-modal__subtitle mb-0">
                {clienteNome ? clienteNome : "Materiais e forma de pagamento"}
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>

        <form className="visitas-orc-form d-flex flex-column flex-grow-1 min-h-0" onSubmit={handleSubmit}>
          <div className="modal-body visitas-orc-modal__body flex-grow-1">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            {loading ? (
              <div className="d-flex justify-content-center py-4">
                <Loader2 className="spin" size={28} aria-label="Carregando" />
              </div>
            ) : (
              <>
                <div className="visitas-orc-summary row g-2 mb-2">
                  <div className="col-4 col-sm-2">
                    <label className="visitas-orc-label">ID</label>
                    <input
                      type="text"
                      className="form-control visitas-orc-input"
                      readOnly
                      value={inventarioId ?? ""}
                    />
                  </div>
                  <div className={mostrarDescontos ? "col-8 col-sm-4" : "col-8 col-sm-10"}>
                    <label className="visitas-orc-label" htmlFor="modal-value-mostrar">
                      Valor total
                    </label>
                    <input
                      id="modal-value-mostrar"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="form-control visitas-orc-input visitas-orc-valor text-center"
                      placeholder="0,00"
                      title={
                        mostrarDescontos
                          ? "Valor final para o cliente — o desconto é calculado automaticamente"
                          : "Soma dos materiais do orçamento"
                      }
                      value={form.valorMostrar}
                      readOnly={!mostrarDescontos}
                      onChange={(e) => form.onValorTotalInput(e.target.value)}
                      onBlur={form.onValorTotalBlur}
                      onFocus={(e) => {
                        if (mostrarDescontos) {
                          form.onValorTotalFocus();
                          e.target.select();
                        }
                      }}
                      onKeyDown={mostrarDescontos ? bloquearTeclaNaoNumerica : undefined}
                      onPaste={
                        mostrarDescontos
                          ? (e) => {
                              e.preventDefault();
                              form.onValorTotalInput(e.clipboardData.getData("text"));
                            }
                          : undefined
                      }
                    />
                  </div>
                  {mostrarDescontos ? (
                    <>
                      <div className="col-6 col-sm-3">
                        <label className="visitas-orc-label" htmlFor="modal-desconto-valor">
                          Desconto (R$)
                        </label>
                        <input
                          id="modal-desconto-valor"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          name="desconto_valor_orc"
                          className="form-control visitas-orc-input text-center"
                          placeholder="0,00"
                          value={form.descontoValor}
                          onChange={(e) => form.onDescontoValorInput(e.target.value)}
                          onBlur={form.onDescontoValorBlur}
                          onFocus={(e) => {
                            form.onDescontoValorFocus();
                            e.target.select();
                          }}
                          onKeyDown={bloquearTeclaNaoNumerica}
                          onPaste={(e) => {
                            e.preventDefault();
                            form.onDescontoValorInput(e.clipboardData.getData("text"));
                          }}
                        />
                      </div>
                      <div className="col-6 col-sm-3">
                        <label className="visitas-orc-label" htmlFor="modal-desconto-pct">
                          Desconto (%)
                        </label>
                        <input
                          id="modal-desconto-pct"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          name="desconto_pct_orc"
                          maxLength={7}
                          className="form-control visitas-orc-input text-center"
                          placeholder="0"
                          value={form.descontoPct}
                          onChange={(e) => form.onDescontoPctInput(e.target.value)}
                          onBlur={form.onDescontoPctBlur}
                          onFocus={(e) => {
                            form.onDescontoPctFocus();
                            e.target.select();
                          }}
                          onKeyDown={bloquearTeclaNaoNumerica}
                          onPaste={(e) => {
                            e.preventDefault();
                            form.onDescontoPctInput(e.clipboardData.getData("text"));
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-12">
                    <label className="visitas-orc-label">CPF/CNPJ</label>
                    <input
                      type="text"
                      className="form-control visitas-orc-input"
                      value={form.cpfCnpj}
                      onChange={(e) => form.setCpfCnpj(e.target.value)}
                    />
                  </div>
                </div>

                <section className="visitas-orc-panel">
                  <h5 className="visitas-orc-panel__title">
                    <i className="bi bi-box-seam" aria-hidden="true" /> Materiais do orçamento
                  </h5>
                  {materiaisLoading ? (
                    <p className="text-muted small mb-2">Carregando materiais…</p>
                  ) : null}
                  {materiaisErro ? (
                    <p className="text-danger small mb-2" role="alert">
                      {materiaisErro}
                    </p>
                  ) : null}
                  <div className="visitas-orc-toolbar row g-2 align-items-end mb-2">
                    <div className="col-12 col-md-4">
                      <label className="visitas-orc-label">Buscar</label>
                      <input
                        type="text"
                        className="form-control visitas-orc-input"
                        placeholder="Filtrar materiais…"
                        value={form.pesquisa}
                        onChange={(e) => form.setPesquisa(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="visitas-orc-label">Material</label>
                      <select
                        className="form-select visitas-orc-input"
                        value={form.materialId}
                        onChange={(e) => form.setMaterialId(e.target.value)}
                        disabled={materiaisLoading || materiais.length === 0}
                      >
                        <option value="">
                          {materiaisLoading
                            ? "Carregando…"
                            : materiais.length === 0
                              ? "Sem materiais"
                              : "Selecione…"}
                        </option>
                        {form.materiaisFiltrados.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.material}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 col-md-2">
                      <label className="visitas-orc-label">Metros</label>
                      <input
                        type="text"
                        className="form-control visitas-orc-input text-center"
                        value={form.metros}
                        onChange={(e) => form.onMetrosInput(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-1 d-grid">
                      <button type="button" className="btn visitas-orc-add-btn" onClick={form.addMaterial}>
                        <i className="bi bi-plus-lg" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="visitas-orc-table-wrap table-responsive">
                    <table className="table table-sm visitas-orc-table mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Material</th>
                          <th className="text-end">Venda</th>
                          <th className="text-end">Metros</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {form.partData.map((linha, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{linha.material}</td>
                            <td className="text-end">
                              {linha.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="text-end">{linha.metros}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => form.removeLinha(i)}
                                aria-label="Remover"
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {mode === "novo" ? (
                  <section className="visitas-orc-panel">
                    <h5 className="visitas-orc-panel__title">
                      <i className="bi bi-wallet2" aria-hidden="true" /> Pagamento
                    </h5>
                    <div className="visitas-orc-pay-grid" role="radiogroup">
                      {(["pix", "debito", "credito"] as const).map((v) => (
                        <label key={v} className="visitas-orc-pay-card">
                          <input
                            type="radio"
                            name="forma_pagamento"
                            value={v}
                            checked={form.formaPagamento === v}
                            onChange={() => form.setFormaPagamento(v)}
                            className="visitas-orc-pay-card__input"
                          />
                          <span className="visitas-orc-pay-card__name">
                            {v === "pix" ? "PIX" : v === "debito" ? "Débito" : "Crédito"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="visitas-orc-obs mt-2">
                  <label className="visitas-orc-label">Observação</label>
                  <textarea
                    className="form-control visitas-orc-input"
                    rows={2}
                    value={form.observacao}
                    onChange={(e) => form.setObservacao(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="modal-footer visitas-orc-modal__footer flex-shrink-0">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn visitas-orc-save-btn" disabled={saving || loading}>
              {saving ? <Loader2 className="spin" size={18} /> : null}
              Salvar orçamento
            </button>
          </div>
        </form>
      </div>
    </AdminModal>
  );
}
