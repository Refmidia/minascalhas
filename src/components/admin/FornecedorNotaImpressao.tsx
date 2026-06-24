import { useEffect } from "react";

import { HOME_SITE } from "@/data/home-config";
import type { EntregaDetalhe } from "@/lib/fornecedores.server";
import {
  documentoRotulo,
  entregaNumeroNota,
  formatDataHora,
  formatDocumentoExib,
  formatEnderecoFornecedor,
  formatMoeda,
  fornecedorRotuloEmpresa,
} from "@/lib/fornecedores-display";

type Props = {
  entrega: EntregaDetalhe;
  autoPrint?: boolean;
};

export function FornecedorNotaImpressao({ entrega, autoPrint = true }: Props) {
  const numeroNota = entregaNumeroNota(entrega.id);
  const empresa = fornecedorRotuloEmpresa(entrega);
  const enviadoEm = formatDataHora(entrega.enviado_em);
  const recebido = entrega.status === "recebido";
  const razao = (entrega.razao_social ?? "").trim();
  const fantasia = (entrega.nome_fantasia ?? "").trim();
  const endereco = formatEnderecoFornecedor(entrega);
  const doc = (entrega.cnpj ?? "").trim();

  useEffect(() => {
    document.body.classList.add("fornecedor-nota-print-page");
    return () => document.body.classList.remove("fornecedor-nota-print-page");
  }, []);

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(t);
  }, [autoPrint, entrega.id]);

  return (
    <div className="forn-nota">
      <div className="forn-nota__actions no-print">
        <button type="button" className="forn-nota__btn forn-nota__btn--primary" onClick={() => window.print()}>
          Imprimir
        </button>
        <button type="button" className="forn-nota__btn" onClick={() => window.close()}>
          Fechar
        </button>
      </div>

      <header className="forn-nota__head">
        <div className="forn-nota__brand">
          <img src={HOME_SITE.img.logoHeader} width={220} height={64} alt="Minas Calhas" />
        </div>
        <div className="forn-nota__meta">
          <strong>Nota de entrega:</strong> {numeroNota}
          {enviadoEm !== "—" ? (
            <>
              {" "}
              · Enviado em {enviadoEm}
            </>
          ) : null}
          {entrega.usuario_nome ? <> · Por {entrega.usuario_nome}</> : null}
        </div>
        <div className="forn-nota__badges">
          {recebido ? (
            <>
              <span className="forn-nota__status forn-nota__status--ok">Recebido pela Minas Calhas</span>
              {entrega.pagamento_status === "pago" ? (
                <span className="forn-nota__status forn-nota__status--pago">Pagamento: pago</span>
              ) : (
                <span className="forn-nota__status forn-nota__status--pg-pend">Pagamento: pendente</span>
              )}
            </>
          ) : (
            <span className="forn-nota__status forn-nota__status--pend">Aguardando conferência</span>
          )}
        </div>
      </header>

      <p className="forn-nota__empresa">{empresa}</p>
      {razao && fantasia && razao !== fantasia ? (
        <p className="forn-nota__linha forn-nota__linha--tight">{razao}</p>
      ) : null}
      {(entrega.contato_nome ?? "").trim() ? (
        <p className="forn-nota__linha forn-nota__linha--tight">
          Responsável: {entrega.contato_nome}
        </p>
      ) : null}
      {doc ? (
        <p className="forn-nota__linha">
          {documentoRotulo(doc)}: {formatDocumentoExib(doc)}
        </p>
      ) : null}
      {endereco ? <p className="forn-nota__linha forn-nota__linha--tight">Endereço: {endereco}</p> : null}
      {(entrega.telefone ?? "").trim() ? (
        <p className="forn-nota__linha forn-nota__linha--tight">Telefone: {entrega.telefone}</p>
      ) : null}

      <table className="forn-nota__table">
        <thead>
          <tr>
            <th>Produto / material</th>
            <th className="text-end">Metros</th>
            <th className="text-end">R$/metro</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {entrega.itens.map((item) => (
            <tr key={item.id}>
              <td>
                {item.material_nome}
                {(item.observacao ?? "").trim() ? (
                  <>
                    <br />
                    <small>{item.observacao}</small>
                  </>
                ) : null}
              </td>
              <td className="text-end">{formatMoeda(item.metros)}</td>
              <td className="text-end">R$ {formatMoeda(item.valor_unitario)}</td>
              <td className="text-end">
                <strong>R$ {formatMoeda(item.total)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="forn-nota__total">
        <strong>Total geral: R$ {formatMoeda(entrega.total_geral)}</strong>
      </p>

      {(entrega.observacao ?? "").trim() ? (
        <div className="forn-nota__obs">
          <strong>Observação da entrega:</strong>
          <br />
          {entrega.observacao}
        </div>
      ) : null}

      <footer className="forn-nota__foot">
        Documento gerado pelo sistema Minas Calhas — uso interno para conferência de materiais recebidos.
      </footer>
    </div>
  );
}
