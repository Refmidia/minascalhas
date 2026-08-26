import { OS_ORCAMENTO_EMPRESA } from "@/lib/os-document";
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
      <header className="ponto-rel-head">
        <div className="ponto-rel-head__brand">
          <img src={empresa.logoSrc} alt="Minas Calhas" width={188} height={48} />
          <p className="ponto-rel-head__tagline">{empresa.tagline}</p>
          <p className="ponto-rel-head__meta">
            CNPJ {empresa.cnpj}
            <br />
            {empresa.enderecoLinha1} — {empresa.enderecoLinha2}
          </p>
        </div>
        <div className="ponto-rel-head__doc">
          <p className="ponto-rel-head__kicker">Relatório para conferência</p>
          <h1 className="ponto-rel-head__title">Folha de ponto</h1>
          {mesLabel ? <p className="ponto-rel-head__mes">{mesLabel}</p> : null}
          <p className="ponto-rel-head__periodo">{periodoLabel}</p>
          <p className="ponto-rel-head__emitido">Emitido em {emitido}</p>
        </div>
      </header>

      <section className="ponto-rel-resumo">
        <div>
          <span className="ponto-rel-resumo__label">Funcionários</span>
          <strong>{grupos.length}</strong>
        </div>
        <div>
          <span className="ponto-rel-resumo__label">Dias com ponto</span>
          <strong>{totalDias}</strong>
        </div>
        <div>
          <span className="ponto-rel-resumo__label">Horas trabalhadas</span>
          <strong>{formatMinutosRelatorio(totalMin)}</strong>
        </div>
      </section>

      {grupos.length === 0 ? (
        <p className="ponto-rel-vazio">Nenhum ponto registrado neste período.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.usuario_id} className="ponto-rel-func">
            <div className="ponto-rel-func__head">
              <h2 className="ponto-rel-func__nome">{g.usuario_nome}</h2>
              <p className="ponto-rel-func__totais">
                {g.dias} dia{g.dias === 1 ? "" : "s"} · {g.total_fmt}
              </p>
            </div>
            <table className="ponto-rel-table">
              <thead>
                <tr>
                  <th className="ponto-rel-table__dia">Dia</th>
                  <th>Entrada</th>
                  <th>Almoço</th>
                  <th>Retorno</th>
                  <th>Saída</th>
                  <th>Intervalo</th>
                  <th>Trabalhado</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {g.jornadas.map((j) => (
                  <tr key={`${j.usuario_id}-${j.data}-${j.entrada_fmt}`}>
                    <td className="ponto-rel-table__dia">
                      <span className="ponto-rel-table__wd">{weekdayCurtoIso(j.data)}</span>{" "}
                      {j.data_fmt}
                    </td>
                    <td>{j.entrada_fmt || "—"}</td>
                    <td>{j.almoco_fmt || "—"}</td>
                    <td>{j.retorno_fmt || "—"}</td>
                    <td>{j.saida_fmt || "—"}</td>
                    <td>{j.intervalo_fmt || "—"}</td>
                    <td className="ponto-rel-table__total">{j.total_fmt || "—"}</td>
                    <td>{j.aberto ? j.status_label : "Encerrado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ponto-rel-visto">
              <div className="ponto-rel-visto__col">
                {assinaturasFuncionario?.[g.usuario_id] ? (
                  <img
                    className="ponto-rel-visto__img"
                    src={assinaturasFuncionario[g.usuario_id]}
                    alt={`Assinatura de ${g.usuario_nome}`}
                  />
                ) : (
                  <span className="ponto-rel-visto__espaco" aria-hidden="true" />
                )}
                <span className="ponto-rel-visto__linha" />
                <span className="ponto-rel-visto__quem">{g.usuario_nome}</span>
                <span>Funcionário</span>
              </div>
              <div className="ponto-rel-visto__col">
                {assinaturaEmpresa ? (
                  <img
                    className="ponto-rel-visto__img"
                    src={assinaturaEmpresa}
                    alt="Assinatura da empresa"
                  />
                ) : (
                  <span className="ponto-rel-visto__espaco" aria-hidden="true" />
                )}
                <span className="ponto-rel-visto__linha" />
                <span className="ponto-rel-visto__quem">{empresa.assinaturaNome}</span>
                <span>Empresa</span>
              </div>
            </div>
          </section>
        ))
      )}

      <footer className="ponto-rel-foot">
        Documento gerado pelo sistema de ponto da Minas Calhas para envio ao contador. Não
        concede acesso ao sistema.
      </footer>
    </article>
  );
}
