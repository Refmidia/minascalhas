import type { AgendamentoItem } from "@/lib/admin-api";
import {
  calcTotaisOrcamento,
  dataEmissaoOs,
  formatOsDocumento,
  formatOsEndereco,
  formatOsMoney,
  formatOsTelefone,
  OS_ORCAMENTO_EMPRESA,
  quantidadeLinhaOrcamento,
  totalLinhaOrcamento,
} from "@/lib/os-document";
import type { OrcamentoLinha } from "@/lib/orcamento.server";

type Props = {
  item: AgendamentoItem;
  itens: OrcamentoLinha[];
};

export function OrcamentoDocument({ item, itens }: Props) {
  const { data, hora } = dataEmissaoOs();
  const valorFinal = Number(item.valor) || 0;
  const { bruto, desconto, total } = calcTotaisOrcamento(itens, valorFinal);
  const empresa = OS_ORCAMENTO_EMPRESA;

  return (
    <div className="os-orc-page" id="orcamento-documento">
      <header className="os-orc-header">
        <img src={empresa.logoSrc} alt="Alex Calhas" width={230} height={56} decoding="async" />
        <div className="os-orc-company-info">{empresa.tagline}</div>
        <div className="os-orc-company-info">{empresa.telefones}</div>
        <div className="os-orc-company-small">{empresa.cnpjIe}</div>
        <div className="os-orc-company-small">{empresa.enderecoLinha1}</div>
        <div className="os-orc-company-small">{empresa.enderecoLinha2}</div>
      </header>

      <h1 className="os-orc-title">ORÇAMENTO</h1>

      <div className="os-orc-section-title">Dados do Documento</div>
      <table className="os-orc-table os-orc-info-table">
        <tbody>
          <tr>
            <td className="os-orc-label">NÚMERO DO PEDIDO:</td>
            <td>{item.id > 0 ? item.id : "—"}</td>
            <td className="os-orc-label">NOME/RAZÃO SOCIAL:</td>
            <td>{item.nome}</td>
          </tr>
          <tr>
            <td className="os-orc-label">DATA DA EMISSÃO:</td>
            <td>{data}</td>
            <td className="os-orc-label">CPF/CNPJ:</td>
            <td>{formatOsDocumento(item.cpfCnpj)}</td>
          </tr>
          <tr>
            <td className="os-orc-label">DATA ENTR./SAÍDA:</td>
            <td>{data}</td>
            <td className="os-orc-label">RG/IE:</td>
            <td />
          </tr>
          <tr>
            <td className="os-orc-label">HORA ENTR./SAÍDA:</td>
            <td>{hora}</td>
            <td className="os-orc-label">ENDEREÇO:</td>
            <td>{formatOsEndereco(item)}</td>
          </tr>
          <tr>
            <td className="os-orc-label">TELEFONE:</td>
            <td>{formatOsTelefone(item.telefone)}</td>
            <td className="os-orc-label">CELULAR:</td>
            <td>{formatOsTelefone(item.telefone)}</td>
          </tr>
        </tbody>
      </table>

      <div className="os-orc-section-title" style={{ marginTop: 10 }}>
        Dados dos Produtos
      </div>
      <table className="os-orc-table os-orc-products-table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>CÓDIGO</th>
            <th>DESCRIÇÃO</th>
            <th style={{ width: 90 }}>V.UNIT</th>
            <th style={{ width: 90 }}>QTDE</th>
            <th style={{ width: 110 }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 ? (
            <tr>
              <td colSpan={5} className="center">
                Nenhum produto encontrado
              </td>
            </tr>
          ) : (
            itens.map((linha, index) => {
              const qtd = quantidadeLinhaOrcamento(linha);
              const totalItem = totalLinhaOrcamento(linha);
              return (
                <tr key={`${index}-${linha.material}`}>
                  <td className="center">{String(index + 1).padStart(6, "0")}</td>
                  <td>{linha.material.toUpperCase()}</td>
                  <td className="right">R$ {formatOsMoney(linha.valor)}</td>
                  <td className="right">{formatOsMoney(qtd)}</td>
                  <td className="right">R$ {formatOsMoney(totalItem)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 15 }}>
        <div className="os-orc-section-title">OBSERVAÇÕES</div>
        <div className="os-orc-obs-box">{item.observacao?.trim() || "\u00a0"}</div>
      </div>

      <div className="os-orc-bottom">
        <div className="os-orc-payment-box">
          <table className="os-orc-table os-orc-payment-table">
            <thead>
              <tr>
                <th>PARCELA</th>
                <th>VALOR</th>
                <th>VENCIMENTO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>01/01</td>
                <td>R$ {formatOsMoney(total)}</td>
                <td>{data}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="os-orc-totals">
          <table className="os-orc-table">
            <tbody>
              <tr>
                <td>TOTAL A PRAZO :</td>
                <td className="value">R$ {formatOsMoney(bruto)}</td>
              </tr>
              <tr>
                <td>VALOR FRETE :</td>
                <td className="value">R$ 0,00</td>
              </tr>
              <tr>
                <td>TOTAL ACRÉSCIMOS :</td>
                <td className="value">R$ 0,00</td>
              </tr>
              <tr>
                <td>TOTAL DESCONTOS :</td>
                <td className="value">R$ {formatOsMoney(desconto)}</td>
              </tr>
            </tbody>
          </table>
          <div className="os-orc-total-final">
            TOTAL A VISTA :
            <span style={{ float: "right" }}>R$ {formatOsMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
