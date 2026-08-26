import { OS_ORCAMENTO_EMPRESA } from "@/lib/os-document";
import { ASSINATURA_PDF_ALTURA_PX, ASSINATURA_PDF_LARGURA_PX } from "@/lib/ponto-assinatura";
import {
  agruparJornadasPorFuncionario,
  formatIsoDataBr,
  formatMesPonto,
  formatMinutosRelatorio,
  weekdayCurtoIso,
  type PontoRelatorioJornada,
} from "@/lib/ponto-relatorio";
import { aplicarHierarquiaJornada } from "@/lib/ponto-hierarquia";
import { formatAgoraPontoControle } from "@/lib/ponto-timezone";

type Props = {
  de: string;
  ate: string;
  jornadas: PontoRelatorioJornada[];
  geradoEm?: string;
  assinaturaEmpresa?: string | null;
  assinaturasFuncionario?: Record<number, string>;
};

function horaFolha(fmt: string | null | undefined): string {
  if (!fmt || fmt === "—") return "—";
  const m = fmt.match(/^(\d{1,2}:\d{2})/);
  return m ? m[1] : fmt;
}

function Cel({
  children,
  className,
  th,
}: {
  children: React.ReactNode;
  className?: string;
  th?: boolean;
}) {
  const Tag = th ? "th" : "td";
  return (
    <Tag className={className}>
      <span className="ponto-rel-table__cell">{children}</span>
    </Tag>
  );
}

function diaFolha(iso: string, dataFmt: string): string {
  const curto = dataFmt.replace(/\/\d{4}$/, "");
  return `${weekdayCurtoIso(iso)} ${curto}`;
}

export function PontoRelatorioDocument({
  de,
  ate,
  jornadas,
  geradoEm,
  assinaturaEmpresa,
  assinaturasFuncionario,
}: Props) {
  const empresa = OS_ORCAMENTO_EMPRESA;
  const jornadasOficiais = jornadas.map((j) => aplicarHierarquiaJornada(j));
  const grupos = agruparJornadasPorFuncionario(jornadasOficiais);
  const mesLabel =
    de.slice(0, 7) === ate.slice(0, 7) ? formatMesPonto(de.slice(0, 7)) : null;
  const periodoLabel = `${formatIsoDataBr(de)} a ${formatIsoDataBr(ate)}`;
  const totalDias = grupos.reduce((n, g) => n + g.dias, 0);
  const totalMin = grupos.reduce((n, g) => n + g.minutos, 0);
  const emitido = geradoEm ?? formatAgoraPontoControle();

  return (
    <article id="ponto-relatorio-documento" className="ponto-rel-page">
      <table className="ponto-rel-head">
        <tbody>
          <tr>
            <td className="ponto-rel-head__brand">
              <img src={empresa.logoSrc} alt="Minas Calhas" />
              <p className="ponto-rel-head__tagline">{empresa.tagline}</p>
              <p className="ponto-rel-head__meta">
                CNPJ {empresa.cnpj}
                <br />
                {empresa.enderecoLinha1} — {empresa.enderecoLinha2}
              </p>
            </td>
            <td className="ponto-rel-head__doc">
              <p className="ponto-rel-head__kicker">Relatório para conferência</p>
              <h1 className="ponto-rel-head__title">Folha de ponto</h1>
              {mesLabel ? <p className="ponto-rel-head__mes">{mesLabel}</p> : null}
              <p className="ponto-rel-head__periodo">{periodoLabel}</p>
              <p className="ponto-rel-head__emitido">Emitido em {emitido}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="ponto-rel-resumo">
        <tbody>
          <tr>
            <td>
              <span className="ponto-rel-resumo__label">Funcionários</span>
              <strong>{grupos.length}</strong>
            </td>
            <td>
              <span className="ponto-rel-resumo__label">Dias com ponto</span>
              <strong>{totalDias}</strong>
            </td>
            <td>
              <span className="ponto-rel-resumo__label">Horas trabalhadas</span>
              <strong>{formatMinutosRelatorio(totalMin)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {grupos.length === 0 ? (
        <p className="ponto-rel-vazio">Nenhum ponto registrado neste período.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.usuario_id} className="ponto-rel-func">
            <table className="ponto-rel-func__head">
              <tbody>
                <tr>
                  <td className="ponto-rel-func__nome">{g.usuario_nome}</td>
                  <td className="ponto-rel-func__totais">
                    {g.dias} dia{g.dias === 1 ? "" : "s"} · {g.total_fmt}
                  </td>
                </tr>
              </tbody>
            </table>
            <table className="ponto-rel-table">
              <colgroup>
                <col className="ponto-rel-col-dia" />
                <col className="ponto-rel-col-hora" />
                <col className="ponto-rel-col-hora" />
                <col className="ponto-rel-col-hora" />
                <col className="ponto-rel-col-hora" />
                <col className="ponto-rel-col-int" />
                <col className="ponto-rel-col-tot" />
                <col className="ponto-rel-col-status" />
              </colgroup>
              <thead>
                <tr>
                  <Cel th className="ponto-rel-table__dia">
                    Dia
                  </Cel>
                  <Cel th>Entrada</Cel>
                  <Cel th>Almoço</Cel>
                  <Cel th>Retorno</Cel>
                  <Cel th>Saída</Cel>
                  <Cel th>Intervalo</Cel>
                  <Cel th>Trabalhado</Cel>
                  <Cel th>Status</Cel>
                </tr>
              </thead>
              <tbody>
                {g.jornadas.map((j) => (
                  <tr key={`${j.usuario_id}-${j.data}-${j.entrada_fmt}`}>
                    <Cel className="ponto-rel-table__dia">{diaFolha(j.data, j.data_fmt)}</Cel>
                    <Cel>{horaFolha(j.entrada_fmt)}</Cel>
                    <Cel>{horaFolha(j.almoco_fmt)}</Cel>
                    <Cel>{horaFolha(j.retorno_fmt)}</Cel>
                    <Cel>{horaFolha(j.saida_fmt)}</Cel>
                    <Cel>{j.intervalo_fmt || "—"}</Cel>
                    <Cel className="ponto-rel-table__total">{j.total_fmt || "—"}</Cel>
                    <Cel>{j.aberto ? j.status_label : "Encerrado"}</Cel>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ponto-rel-visto-gap" aria-hidden="true" />
            <p className="ponto-rel-visto__titulo">Assinaturas</p>
            <table className="ponto-rel-visto">
              <tbody>
                <tr>
                  <td className="ponto-rel-visto__col">
                    {assinaturasFuncionario?.[g.usuario_id] ? (
                      <img
                        className="ponto-rel-visto__img"
                        src={assinaturasFuncionario[g.usuario_id]}
                        alt={`Assinatura de ${g.usuario_nome}`}
                        width={ASSINATURA_PDF_LARGURA_PX}
                        height={ASSINATURA_PDF_ALTURA_PX}
                      />
                    ) : (
                      <span className="ponto-rel-visto__espaco" aria-hidden="true" />
                    )}
                    <div className="ponto-rel-visto__linha" />
                    <div className="ponto-rel-visto__quem">{g.usuario_nome}</div>
                    <div>Funcionário</div>
                  </td>
                  <td className="ponto-rel-visto__col">
                    {assinaturaEmpresa ? (
                      <img
                        className="ponto-rel-visto__img"
                        src={assinaturaEmpresa}
                        alt="Assinatura da empresa"
                        width={ASSINATURA_PDF_LARGURA_PX}
                        height={ASSINATURA_PDF_ALTURA_PX}
                      />
                    ) : (
                      <span className="ponto-rel-visto__espaco" aria-hidden="true" />
                    )}
                    <div className="ponto-rel-visto__linha" />
                    <div className="ponto-rel-visto__quem">{empresa.assinaturaNome}</div>
                    <div>Empresa</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        ))
      )}
    </article>
  );
}
