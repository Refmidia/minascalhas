import { useLayoutEffect, useState } from "react";

import { PontoAssinaturaPad } from "@/components/admin/PontoAssinaturaPad";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import { lerAssinaturaEmpresaPonto, salvarAssinaturaEmpresaPonto } from "@/lib/ponto-assinatura";
import { fetchAssinaturaUsuario } from "@/lib/usuarios-client";

export type PontoAssinaturaConfirmacao = {
  assFunc: boolean;
  assEmpresa: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  usuarioId: number;
  funcionarioNome: string;
  acao: "baixar" | "abrir";
  confirmando?: boolean;
  onConfirm: (opts: PontoAssinaturaConfirmacao) => void;
};

export function PontoAssinaturaFolhaModal({
  open,
  onClose,
  usuarioId,
  funcionarioNome,
  acao,
  confirmando,
  onConfirm,
}: Props) {
  const [incluirFunc, setIncluirFunc] = useState(true);
  const [incluirEmpresa, setIncluirEmpresa] = useState(true);
  const [funcSrc, setFuncSrc] = useState<string | null>(null);
  const [empresaSrc, setEmpresaSrc] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [carregandoFunc, setCarregandoFunc] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    setIncluirEmpresa(true);
    setEmpresaSrc(lerAssinaturaEmpresaPonto());
    setSeed((s) => s + 1);
    setCarregandoFunc(true);
    setFuncSrc(null);
    let cancelled = false;
    fetchAssinaturaUsuario(usuarioId)
      .then((src) => {
        if (cancelled) return;
        setFuncSrc(src);
        setIncluirFunc(Boolean(src));
      })
      .catch(() => {
        if (cancelled) return;
        setFuncSrc(null);
        setIncluirFunc(false);
      })
      .finally(() => {
        if (!cancelled) setCarregandoFunc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, usuarioId]);

  function confirmar() {
    if (confirmando) return;
    salvarAssinaturaEmpresaPonto(empresaSrc);
    onConfirm({
      assFunc: incluirFunc && Boolean(funcSrc),
      assEmpresa: incluirEmpresa && Boolean(empresaSrc),
    });
  }

  const tituloAcao = acao === "abrir" ? "Abrir folha" : "Baixar PDF";

  return (
    <AdminModal
      open={open}
      onClose={confirmando ? () => undefined : onClose}
      dialogClass="modal-lg"
      layerClass="dash-ponto-assinatura-layer"
      closeOnBackdrop={!confirmando}
    >
      <div className="modal-content visitas-orc-modal__content dash-ponto-ass-modal">
        <div className="modal-header visitas-orc-modal__header flex-shrink-0">
          <div className="visitas-orc-modal__head">
            <span className="visitas-orc-modal__head-icon" aria-hidden="true">
              <i className="bi bi-pen" />
            </span>
            <div>
              <h4 className="modal-title visitas-orc-modal__title mb-0">Assinaturas da folha</h4>
              <p className="visitas-orc-modal__subtitle mb-0">{funcionarioNome}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Fechar"
            onClick={onClose}
            disabled={confirmando}
          />
        </div>

        <div className="modal-body dash-edit-modal__body">
          <p className="dash-ponto-ass-modal__intro">
            A assinatura do funcionário vem do perfil. Aqui você só confirma e, se quiser, assina
            pela empresa.
          </p>

          <label className={`dash-ponto-ass-modal__check${funcSrc ? "" : " is-off"}`}>
            <input
              type="checkbox"
              checked={incluirFunc && Boolean(funcSrc)}
              onChange={(e) => setIncluirFunc(e.target.checked)}
              disabled={confirmando || carregandoFunc || !funcSrc}
            />
            <span>Incluir assinatura de {funcionarioNome}</span>
          </label>
          {carregandoFunc ? <p className="text-muted">Carregando assinatura do perfil…</p> : null}
          {!carregandoFunc && funcSrc ? (
            <div className="dash-ponto-ass-preview">
              <img src={funcSrc} alt={`Assinatura de ${funcionarioNome}`} />
            </div>
          ) : null}
          {!carregandoFunc && !funcSrc ? (
            <p className="dash-ponto-ass-modal__aviso">
              {funcionarioNome} ainda não gravou a assinatura. Peça para assinar em{" "}
              <strong>Usuários</strong> (editar perfil) ou na tela de <strong>Ponto</strong> dele.
            </p>
          ) : null}

          <label className="dash-ponto-ass-modal__check">
            <input
              type="checkbox"
              checked={incluirEmpresa}
              onChange={(e) => setIncluirEmpresa(e.target.checked)}
              disabled={confirmando}
            />
            <span>Incluir assinatura da empresa</span>
          </label>
          {seed > 0 && incluirEmpresa ? (
            <PontoAssinaturaPad
              key={`empresa-${seed}`}
              initial={empresaSrc}
              onChange={setEmpresaSrc}
              label="Assinatura — Minas Calhas"
              disabled={confirmando}
            />
          ) : null}
        </div>

        <div className="modal-footer visitas-orc-modal__footer flex-shrink-0">
          <button
            type="button"
            className="btn dash-edit-modal__btn-cancel"
            onClick={onClose}
            disabled={confirmando}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn visitas-orc-add-btn"
            onClick={confirmar}
            disabled={confirmando}
          >
            <i className={`bi ${acao === "abrir" ? "bi-printer" : "bi-download"}`} aria-hidden="true" />{" "}
            {confirmando ? "Gerando…" : tituloAcao}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
