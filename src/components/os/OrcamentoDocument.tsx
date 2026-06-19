import type { AgendamentoItem } from "@/lib/admin-api";
import {
  calcTotaisOrcamento,
  condicaoPagamentoExibicao,
  dataEmissaoOs,
  formatOsDocumento,
  formatOsEndereco,
  formatOsMoney,
  formatOsTelefone,
  observacaoExibicao,
  OS_ORCAMENTO_EMPRESA,
  quantidadeLinhaOrcamento,
  totalLinhaOrcamento,
} from "@/lib/os-document";
import { mesclarLinhasOrcamento, type OrcamentoLinha } from "@/lib/orcamento.server";

type Props = {
  item: AgendamentoItem;
  itens: OrcamentoLinha[];
};

function SecHead({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="os-orc-sec-head">
      <span className="os-orc-sec-head__icon" aria-hidden="true">
        {children}
      </span>
      <span className="os-orc-sec-head__title">{title}</span>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="os-orc-kv">
      <span className="os-orc-kv__label">{label}</span>
      <span className="os-orc-kv__value">{value}</span>
    </div>
  );
}

function PixBrandIcon() {
  return (
    <svg className="os-orc-pix__brand-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#32BCAD"
        d="M24 4c2.2 0 4 1.8 4 4v8.8L36.8 12c1.6-1.6 4.1-1.6 5.7 0s1.6 4.1 0 5.7L33.7 26.4H42.4c2.2 0 4 1.8 4 4s-1.8 4-4 4H33.7L42.5 36c1.6 1.6 1.6 4.1 0 5.7s-4.1 1.6-5.7 0L28 33.2V42c0 2.2-1.8 4-4 4s-4-1.8-4-4v-8.8L11.2 36c-1.6 1.6-4.1 1.6-5.7 0s-1.6-4.1 0-5.7L14.3 21.6H5.6c-2.2 0-4-1.8-4-4s1.8-4 4-4h8.7L5.5 12c-1.6-1.6-1.6-4.1 0-5.7s4.1-1.6 5.7 0L20 14.8V6c0-2.2 1.8-4 4-4z"
      />
    </svg>
  );
}

function TopIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="os-orc-top__ico" aria-hidden="true">
      {children}
    </span>
  );
}

function TopLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="os-orc-top__line">
      <TopIcon>{icon}</TopIcon>
      <span className="os-orc-top__text">{children}</span>
    </div>
  );
}

function MetaChip({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="os-orc-meta-chip">
      <span className="os-orc-meta-chip__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="os-orc-meta-chip__label">{label}</span>
        <strong className="os-orc-meta-chip__value">{value}</strong>
      </div>
    </div>
  );
}

export function OrcamentoDocument({ item, itens }: Props) {
  const { data, hora } = dataEmissaoOs();
  const valorFinal = Number(item.valor) || 0;
  const linhas = mesclarLinhasOrcamento(itens);
  const { bruto, desconto, total } = calcTotaisOrcamento(linhas, valorFinal);
  const empresa = OS_ORCAMENTO_EMPRESA;

  return (
    <div className="os-orc-page" id="orcamento-documento">
      <header className="os-orc-top">
        <div className="os-orc-top__col os-orc-top__col--brand">
          <img src={empresa.logoSrc} alt="Alex Calhas" width={188} height={48} decoding="async" />
          <p className="os-orc-top__tagline">{empresa.tagline}</p>
        </div>

        <div className="os-orc-top__col os-orc-top__col--contact">
          <TopLine
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
            }
          >
            {empresa.enderecoLinha1}
            <br />
            {empresa.enderecoLinha2}
            <br />
            {empresa.cidade}
          </TopLine>
          <TopLine
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.25 1.01l-2.2 2.22z" />
              </svg>
            }
          >
            {empresa.telefone1}
          </TopLine>
          <TopLine
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 18h-4v-1h4v1zm3.25-4H6.75V4h10.5v11z" />
              </svg>
            }
          >
            {empresa.telefone2}
          </TopLine>
        </div>

        <div className="os-orc-top__col os-orc-top__col--legal">
          <TopLine
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zm-2 12H4v-2h6v2zm0-4H4v-2h6v2zm0-4H4V9h6v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V9h6v2z" />
              </svg>
            }
          >
            CNPJ: {empresa.cnpj}
            <br />
            IE: {empresa.ie}
          </TopLine>
          <TopLine
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm0 14H5.17L4 17.17V4h16v12z" />
              </svg>
            }
          >
            {empresa.whatsapp}
          </TopLine>
        </div>
      </header>

      <div className="os-orc-divider" aria-hidden="true" />

      <div className="os-orc-title-row">
        <h1 className="os-orc-title">ORÇAMENTO</h1>
        <div className="os-orc-meta-row">
          <MetaChip
            label="Nº do orçamento"
            value={item.id > 0 ? item.id : "—"}
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            }
          />
          <MetaChip
            label="Data da emissão"
            value={data}
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10z" />
              </svg>
            }
          />
          <MetaChip
            label="Hora de emissão"
            value={hora}
            icon={
              <svg viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 11H7v-2h5V7h2v6z" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="os-orc-panels">
        <section className="os-orc-panel">
          <SecHead title="Dados do cliente">
            <svg viewBox="0 0 24 24">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z" />
            </svg>
          </SecHead>
          <Kv label="Nome / Razão social" value={item.nome} />
          <Kv label="CPF / CNPJ" value={formatOsDocumento(item.cpfCnpj)} />
          <Kv label="RG / IE" value="—" />
          <Kv label="Endereço" value={formatOsEndereco(item)} />
          <Kv label="Telefone" value={formatOsTelefone(item.telefone)} />
          <Kv label="Celular" value={formatOsTelefone(item.telefone)} />
        </section>

        <section className="os-orc-panel">
          <SecHead title="Dados do documento">
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </SecHead>
          <Kv label="Data de emissão" value={data} />
          <Kv label="Data de saída" value={data} />
          <Kv label="Condição de pagamento" value={condicaoPagamentoExibicao(item)} />
          <Kv label="Validade da proposta" value={empresa.validadeProposta} />
          <Kv label="Vendedor" value="Alex Calhas" />
        </section>
      </div>

      <section className="os-orc-block">
        <SecHead title="Itens do orçamento">
          <svg viewBox="0 0 24 24">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 00-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
          </svg>
        </SecHead>
        <table className="os-orc-table os-orc-items">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Valor unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={5} className="os-orc-items__empty">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              linhas.map((linha, index) => {
                const qtd = quantidadeLinhaOrcamento(linha);
                const totalItem = totalLinhaOrcamento(linha);
                return (
                  <tr key={`${index}-${linha.material}`}>
                    <td>{String(index + 1).padStart(6, "0")}</td>
                    <td>{linha.material.toUpperCase()}</td>
                    <td className="num">{formatOsMoney(qtd)}</td>
                    <td className="num">R$ {formatOsMoney(linha.valor)}</td>
                    <td className="num">R$ {formatOsMoney(totalItem)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="os-orc-block">
        <SecHead title="Observações">
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </SecHead>
        <div className="os-orc-obs-box">{observacaoExibicao(item)}</div>
      </section>

      <section className="os-orc-block">
        <SecHead title="Resumo financeiro">
          <svg viewBox="0 0 24 24">
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
          </svg>
        </SecHead>
        <div className="os-orc-finance">
          <div className="os-orc-finance__parcelas">
            <table className="os-orc-table os-orc-parcelas">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
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
          <div className="os-orc-finance__totals">
            <div className="os-orc-sum-row">
              <span>Total dos itens</span>
              <strong>R$ {formatOsMoney(bruto)}</strong>
            </div>
            <div className="os-orc-sum-row">
              <span>Descontos</span>
              <strong>R$ {formatOsMoney(desconto)}</strong>
            </div>
            <div className="os-orc-total-box">
              <span className="os-orc-total-box__label">Total à vista</span>
              <strong className="os-orc-total-box__value">R$ {formatOsMoney(total)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="os-orc-pix-page">
        <section className="os-orc-pix-box">
          <div className="os-orc-pix__grid">
            <div className="os-orc-pix__col os-orc-pix__col--info">
              <PixBrandIcon />
              <p className="os-orc-pix__title">Pagamento via Pix</p>
              <p className="os-orc-pix__lead">
                Escaneie o QR Code com o app do seu banco para pagar via Pix.
              </p>
              <p className="os-orc-pix__chave">
                <strong>Chave Pix:</strong> {empresa.chavePix}
              </p>
            </div>
            <div className="os-orc-pix__col os-orc-pix__col--qr">
              <img
                src={empresa.pixQrSrc}
                alt="QR Code Pix Alex Calhas"
                width={132}
                height={132}
                decoding="async"
              />
            </div>
            <ul className="os-orc-pix__checks">
              <li>Verifique os dados antes de confirmar.</li>
              <li>Pagamento aprovado em poucos segundos.</li>
              <li>Guarde o comprovante para sua segurança.</li>
            </ul>
          </div>
        </section>

        <section className="os-orc-aprovacao" aria-label="Aprovação do orçamento">
          <div className="os-orc-aprovacao__box">
            <h3 className="os-orc-aprovacao__title">Aprovação do orçamento</h3>
            <p className="os-orc-aprovacao__decl">
              Declaro que li e aprovo os itens, valores e condições deste orçamento.
            </p>
            <div className="os-orc-aprovacao__grid">
              <div className="os-orc-aprovacao__col">
                <div className="os-orc-aprovacao__sign-area">
                  <img
                    src={empresa.assinaturaSrc}
                    alt="Assinatura Alex Calhas"
                    className="os-orc-aprovacao__img"
                    width={200}
                    height={56}
                    decoding="async"
                  />
                </div>
                <span className="os-orc-aprovacao__line" aria-hidden="true" />
                <strong>{empresa.assinaturaNome}</strong>
                <span>{empresa.assinaturaCargo}</span>
              </div>
              <div className="os-orc-aprovacao__col">
                <div className="os-orc-aprovacao__sign-area os-orc-aprovacao__sign-area--client" aria-hidden="true" />
                <span className="os-orc-aprovacao__line" aria-hidden="true" />
                <strong>Assinatura do cliente</strong>
                <span>Data: ___/___/___</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="os-orc-footer">
          <p className="os-orc-footer__thanks">Agradecemos a preferência!</p>
          <p className="os-orc-footer__brand">Alex Calhas — Qualidade em calhas, rufos e pingadeiras.</p>
        </footer>
      </div>
    </div>
  );
}
