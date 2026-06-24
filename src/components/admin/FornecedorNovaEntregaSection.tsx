import { useCallback, useMemo, useState } from "react";

import { DashConfirmModal } from "@/components/admin/DashConfirmModal";
import {
  postFornecedorPortalAction,
  type CarrinhoItemEntrega,
  type MaterialLiberadoRow,
} from "@/lib/fornecedores-client";
import {
  formatMoeda,
  parseDecimalInput,
  precoMaterialFornecedor,
  totalLinhaCarrinho,
} from "@/lib/fornecedores-display";
import { dashToast } from "@/lib/dash-ui";

type Props = {
  fornecedorId: number;
  controleUrl: number;
  materiais: MaterialLiberadoRow[];
  carrinho: CarrinhoItemEntrega[];
  onCarrinhoChange: (items: CarrinhoItemEntrega[]) => void;
  onEnviado: () => void;
};

export function FornecedorNovaEntregaSection({
  fornecedorId,
  controleUrl,
  materiais,
  carrinho,
  onCarrinhoChange,
  onEnviado,
}: Props) {
  const [materialId, setMaterialId] = useState("");
  const [metros, setMetros] = useState("1");
  const [valorUnit, setValorUnit] = useState("");
  const [obsItem, setObsItem] = useState("");
  const [obsEntrega, setObsEntrega] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmEnviar, setConfirmEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const controle = controleUrl > 0 ? controleUrl : fornecedorId;

  const linhaPreview = useMemo(
    () => parseDecimalInput(metros) * parseDecimalInput(valorUnit),
    [metros, valorUnit],
  );

  const totalCarrinho = useMemo(
    () => carrinho.reduce((s, it) => s + totalLinhaCarrinho(it.metros, it.valor_unitario), 0),
    [carrinho],
  );

  const onMaterialChange = useCallback(
    (id: string) => {
      setMaterialId(id);
      const mat = materiais.find((m) => String(m.id) === id);
      if (mat) {
        const preco = precoMaterialFornecedor(mat);
        if (preco > 0) setValorUnit(formatMoeda(preco));
      }
    },
    [materiais],
  );

  async function adicionarItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await postFornecedorPortalAction(
        {
          action: "adicionar_item",
          material_id: Number(materialId),
          metros,
          valor_unitario: valorUnit,
          observacao: obsItem,
        },
        controle > 0 ? controle : undefined,
      );
      if (res.carrinho) onCarrinhoChange(res.carrinho);
      dashToast(res.message, res.ok ? "success" : "danger");
      if (res.ok) {
        setObsItem("");
      }
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro ao adicionar.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  async function removerItem(tempId: string) {
    try {
      const res = await postFornecedorPortalAction(
        { action: "remover_item", temp_id: tempId },
        controle > 0 ? controle : undefined,
      );
      if (res.carrinho) onCarrinhoChange(res.carrinho);
      dashToast(res.message, "success");
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro ao remover.", "danger");
    }
  }

  async function confirmarEnviar() {
    setEnviando(true);
    try {
      const res = await postFornecedorPortalAction(
        { action: "enviar_entrega", observacao_entrega: obsEntrega },
        controle > 0 ? controle : undefined,
      );
      onCarrinhoChange(res.carrinho ?? []);
      dashToast(res.message, res.ok ? "success" : "danger");
      if (res.ok) {
        setObsEntrega("");
        setConfirmEnviar(false);
        onEnviado();
      }
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Erro ao enviar.", "danger");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="text-muted small mb-3 mb-md-4">
        Adicione cada produto à nota, revise a lista e clique em{" "}
        <strong>Confirmar e enviar</strong>. A Minas Calhas receberá tudo em uma única nota de
        entrega.
      </p>

      <section className="dash-form-block forn-lancar-compra mb-4">
        <h3 className="dash-form-block__title h6 mb-3">
          <i className="bi bi-cart-plus" aria-hidden="true" /> Adicionar produto à nota
        </h3>
        {materiais.length === 0 ? (
          <p className="inv-detail-empty mb-0">
            Nenhum material liberado ainda. Peça ao administrador da Minas Calhas.
          </p>
        ) : (
          <form className="dash-form" onSubmit={adicionarItem}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-5">
                <label className="form-label" htmlFor="entrega-material-id">
                  Produto / material
                </label>
                <select
                  className="form-select"
                  id="entrega-material-id"
                  required
                  value={materialId}
                  onChange={(e) => onMaterialChange(e.target.value)}
                >
                  <option value="">Selecione o material…</option>
                  {materiais.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.material}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="entrega-metros">
                  Metros
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="entrega-metros"
                  inputMode="decimal"
                  required
                  value={metros}
                  onChange={(e) => setMetros(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label" htmlFor="entrega-valor-unit">
                  R$ / metro
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="entrega-valor-unit"
                  placeholder="0,00"
                  inputMode="decimal"
                  required
                  value={valorUnit}
                  onChange={(e) => setValorUnit(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-3">
                <div className="forn-compra-total-preview small text-muted mb-1">
                  Linha: <strong>R$ {formatMoeda(linhaPreview)}</strong>
                </div>
                <button
                  type="submit"
                  className="analytics-btn analytics-btn--outline analytics-btn--sm w-100"
                  disabled={submitting}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" />{" "}
                  {submitting ? "Adicionando…" : "Adicionar à nota"}
                </button>
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="entrega-obs-item">
                  Obs. deste item <span className="text-muted">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="entrega-obs-item"
                  maxLength={255}
                  placeholder="Ex.: cor, lote…"
                  value={obsItem}
                  onChange={(e) => setObsItem(e.target.value)}
                />
              </div>
            </div>
          </form>
        )}

        {carrinho.length > 0 ? (
          <div className="forn-carrinho mt-4">
            <h4 className="dash-form-block__title h6 mb-2">
              <i className="bi bi-receipt-cutoff" aria-hidden="true" /> Nota em montagem (
              {carrinho.length} itens)
            </h4>
            <div className="inv-table-shell mb-3">
              <div className="table-responsive">
                <table className="table inv-data-table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th className="text-end">Metros</th>
                      <th className="text-end">R$/m</th>
                      <th className="text-end">Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {carrinho.map((ci) => {
                      const linha = totalLinhaCarrinho(ci.metros, ci.valor_unitario);
                      return (
                        <tr key={ci.temp_id}>
                          <td>{ci.material_nome}</td>
                          <td className="text-end">{formatMoeda(parseDecimalInput(ci.metros))}</td>
                          <td className="text-end">
                            R$ {formatMoeda(parseDecimalInput(ci.valor_unitario))}
                          </td>
                          <td className="text-end">
                            <strong>R$ {formatMoeda(linha)}</strong>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="inv-action-btn inv-action-btn--muted"
                              title="Remover"
                              onClick={() => void removerItem(ci.temp_id)}
                            >
                              <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="dash-form">
              <div className="mb-2">
                <label className="form-label" htmlFor="obs-entrega-geral">
                  Observação geral da entrega
                </label>
                <textarea
                  id="obs-entrega-geral"
                  className="form-control"
                  rows={2}
                  maxLength={500}
                  placeholder="Ex.: placa do caminhão, número da NF…"
                  value={obsEntrega}
                  onChange={(e) => setObsEntrega(e.target.value)}
                />
              </div>
              <p className="small text-muted mb-2">
                Total da nota: <strong>R$ {formatMoeda(totalCarrinho)}</strong>
              </p>
              <button
                type="button"
                className="analytics-btn analytics-btn--primary"
                onClick={() => setConfirmEnviar(true)}
              >
                <i className="bi bi-send-check" aria-hidden="true" /> Confirmar e enviar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <DashConfirmModal
        open={confirmEnviar}
        loading={enviando}
        options={{
          title: "Enviar nota de entrega?",
          message: "Depois do envio não dá para editar.",
          confirmText: "Confirmar e enviar",
          icon: "bi-send-check",
          variant: "primary",
        }}
        onConfirm={() => void confirmarEnviar()}
        onCancel={() => setConfirmEnviar(false)}
      />
    </>
  );
}
