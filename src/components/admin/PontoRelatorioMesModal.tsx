import { useEffect, useState } from "react";

import { DashMonthPicker } from "@/components/admin/DashDatePickers";
import { PontoAssinaturaFolhaModal } from "@/components/admin/PontoAssinaturaFolhaModal";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import { UserThumb } from "@/components/admin/UserThumb";
import { dashToast } from "@/lib/dash-ui";
import type { PontoPdfParams } from "@/lib/ponto-pdf";
import { baixarPdfPontoRelatorio, urlPontoRelatorio } from "@/lib/ponto-pdf";
import { diasNoMes, mesPontoPdfLiberado, periodoDoMes, shiftYm } from "@/lib/ponto-relatorio";
import { pontoHojeIso } from "@/lib/ponto-timezone";

type FechamentoItem = {
  usuario_id: number;
  nome: string;
  thumb: string;
  thumb_url?: string | null;
  primeira_pago: boolean;
  segunda_pago: boolean;
  mes_fechado: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  mes: string;
  onMesChange?: (mes: string) => void;
};

export function PontoRelatorioMesModal({ open, onClose, mes, onMesChange }: Props) {
  const hojeYm = pontoHojeIso().slice(0, 7);
  const minYm = `${Number(hojeYm.slice(0, 4)) - 4}-01`;
  const [mesAtual, setMesAtual] = useState(mes);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [lista, setLista] = useState<FechamentoItem[]>([]);
  const [baixandoId, setBaixandoId] = useState<number | null>(null);
  const [pendencia, setPendencia] = useState<{
    item: FechamentoItem;
    acao: "baixar" | "abrir";
  } | null>(null);

  useEffect(() => {
    if (open) setMesAtual(mes);
    else setPendencia(null);
  }, [open, mes]);

  function escolherMes(next: string) {
    if (next < minYm) return;
    if (next > hojeYm) return;
    setMesAtual(next);
    onMesChange?.(next);
  }

  useEffect(() => {
    if (!open || !mesAtual) {
      setLista([]);
      setErro("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErro("");
    fetch(`/api/admin/funcionarios-pagamento?fechamento_mes=${encodeURIComponent(mesAtual)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          funcionarios?: FechamentoItem[];
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.message ?? "Não foi possível carregar os funcionários.");
        }
        if (!cancelled) setLista(json.funcionarios ?? []);
      })
      .catch((e) => {
        if (!cancelled) setErro(e instanceof Error ? e.message : "Erro ao carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, mesAtual]);

  function paramsDoItem(
    item: FechamentoItem,
    assinaturas: { assFunc: boolean; assEmpresa: boolean },
  ): PontoPdfParams {
    const periodo = periodoDoMes(mesAtual);
    return {
      de: periodo.de,
      ate: periodo.ate,
      usuario: item.usuario_id,
      assFunc: assinaturas.assFunc,
      assEmpresa: assinaturas.assEmpresa,
    };
  }

  function pedirAssinatura(item: FechamentoItem, acao: "baixar" | "abrir") {
    if (!mesLiberado || baixandoId != null) return;
    setPendencia({ item, acao });
  }

  async function confirmarAssinatura(assinaturas: { assFunc: boolean; assEmpresa: boolean }) {
    if (!pendencia) return;
    const { item, acao } = pendencia;
    const params = paramsDoItem(item, assinaturas);
    if (acao === "abrir") {
      window.open(urlPontoRelatorio(params), "_blank", "noopener");
      setPendencia(null);
      return;
    }
    setBaixandoId(item.usuario_id);
    try {
      await baixarPdfPontoRelatorio(params, item.nome);
      dashToast(`PDF de ${item.nome} baixado. Envie o arquivo para o contador.`, "success");
      setPendencia(null);
    } catch (err) {
      dashToast(err instanceof Error ? err.message : "Não foi possível gerar o PDF.", "danger");
    } finally {
      setBaixandoId(null);
    }
  }

  const mesAnterior = shiftYm(mesAtual, -1);
  const mesProximo = shiftYm(mesAtual, 1);
  const podeAnterior = mesAnterior >= minYm;
  const podeProximo = mesProximo <= hojeYm;
  const ehMesAtual = mesAtual === hojeYm;
  const mesLiberado = mesPontoPdfLiberado(mesAtual, pontoHojeIso());
  const mesJunho = "2026-06";
  const diasMes = diasNoMes(mesAtual);

  return (
    <>
    <AdminModal open={open} onClose={onClose} dialogClass="modal-lg">
      <div className="modal-content visitas-orc-modal__content dash-ponto-relatorio-modal">
        <div className="modal-header visitas-orc-modal__header flex-shrink-0">
          <div className="visitas-orc-modal__head">
            <span className="visitas-orc-modal__head-icon" aria-hidden="true">
              <i className="bi bi-file-earmark-pdf" />
            </span>
            <div>
              <h4 className="modal-title visitas-orc-modal__title mb-0">Baixar folha de ponto</h4>
              <p className="visitas-orc-modal__subtitle mb-0">
                Troque o mês para baixar folhas anteriores
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" aria-label="Fechar" onClick={onClose} />
        </div>

        <div className="modal-body dash-edit-modal__body">
          <div className="dash-ponto-relatorio-modal__mes">
            <button
              type="button"
              className="dash-ponto-relatorio-modal__mes-nav"
              aria-label="Mês anterior"
              disabled={!podeAnterior}
              onClick={() => escolherMes(mesAnterior)}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <DashMonthPicker
              id="ponto-pdf-mes-modal"
              value={mesAtual}
              onChange={escolherMes}
              minYm={minYm}
              maxYm={hojeYm}
            />
            <button
              type="button"
              className="dash-ponto-relatorio-modal__mes-nav"
              aria-label="Próximo mês"
              disabled={!podeProximo}
              onClick={() => escolherMes(mesProximo)}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="dash-ponto-relatorio-modal__atalhos">
            <button
              type="button"
              className={`dash-ponto-relatorio-modal__atalho${mesAtual === mesJunho ? " is-ativo" : ""}`}
              disabled={mesAtual === mesJunho}
              onClick={() => escolherMes(mesJunho)}
            >
              Junho 2026
            </button>
            <button
              type="button"
              className="dash-ponto-relatorio-modal__atalho"
              disabled={!podeAnterior}
              onClick={() => escolherMes(mesAnterior)}
            >
              Mês anterior
            </button>
            <button
              type="button"
              className={`dash-ponto-relatorio-modal__atalho${ehMesAtual ? " is-ativo" : ""}`}
              disabled={ehMesAtual}
              onClick={() => escolherMes(hojeYm)}
            >
              Este mês
            </button>
          </div>

          <p className="dash-ponto-relatorio-modal__intro">
            Escolha o funcionário. A assinatura dele vem do perfil. Junho já está liberado. Os outros
            meses ficam disponíveis depois do último dia do mês.
          </p>

          {loading ? <p className="text-muted mb-0">Carregando funcionários…</p> : null}
          {erro ? <div className="alert alert-danger mb-0">{erro}</div> : null}

          {!loading && !erro && lista.length > 0 && !mesLiberado ? (
            <div className="alert alert-warning dash-ponto-relatorio-modal__aviso">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              <span>
                Este mês ainda não terminou. Espere o dia {diasMes} ou abra junho / outro mês já
                encerrado para baixar o PDF.
              </span>
            </div>
          ) : null}

          {!loading && !erro && lista.length === 0 ? (
            <p className="text-muted mb-0">Nenhum funcionário cadastrado.</p>
          ) : null}

          {!loading && !erro ? (
            <ul className="dash-ponto-relatorio-modal__lista">
              {lista.map((item) => (
                <li
                  key={item.usuario_id}
                  className={`dash-ponto-relatorio-modal__item${mesLiberado ? " is-fechado" : " is-aberto"}`}
                >
                  <div className="dash-ponto-relatorio-modal__pessoa">
                    <UserThumb
                      nome={item.nome}
                      thumb={item.thumb}
                      thumbUrl={item.thumb_url}
                      size="sm"
                    />
                    <div>
                      <strong className="dash-ponto-relatorio-modal__nome">{item.nome}</strong>
                      {mesLiberado ? (
                        <span className="dash-ponto-relatorio-modal__badge dash-ponto-relatorio-modal__badge--ok">
                          Liberado para baixar
                        </span>
                      ) : (
                        <span className="dash-ponto-relatorio-modal__msg">
                          Aguarde o mês fechar ({diasMes} dias).
                        </span>
                      )}
                    </div>
                  </div>
                  {mesLiberado ? (
                    <div className="dash-ponto-relatorio-modal__acoes">
                      <button
                        type="button"
                        className="btn visitas-orc-add-btn btn-sm"
                        disabled={baixandoId != null}
                        onClick={() => pedirAssinatura(item, "baixar")}
                      >
                        <i className="bi bi-download" aria-hidden="true" />
                        {baixandoId === item.usuario_id ? " Gerando…" : " Baixar PDF"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={baixandoId != null}
                        title="Ver a folha sem baixar"
                        onClick={() => pedirAssinatura(item, "abrir")}
                      >
                        <i className="bi bi-eye" aria-hidden="true" /> Ver
                      </button>
                    </div>
                  ) : (
                    <span className="dash-ponto-relatorio-modal__bloqueado">Indisponível</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="modal-footer visitas-orc-modal__footer flex-shrink-0">
          <button type="button" className="btn dash-edit-modal__btn-cancel" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </AdminModal>
    <PontoAssinaturaFolhaModal
      open={pendencia != null}
      onClose={() => {
        if (baixandoId != null) return;
        setPendencia(null);
      }}
      usuarioId={pendencia?.item.usuario_id ?? 0}
      funcionarioNome={pendencia?.item.nome ?? ""}
      acao={pendencia?.acao ?? "baixar"}
      confirmando={baixandoId != null}
      onConfirm={(opts) => void confirmarAssinatura(opts)}
    />
    </>
  );
}
