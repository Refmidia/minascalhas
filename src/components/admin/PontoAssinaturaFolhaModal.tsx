import { useLayoutEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { AdminModal } from "@/components/admin/modals/AdminModal";
import { AssinaturaPreviewImg } from "@/components/admin/AssinaturaPreviewImg";
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
  const { user } = useAdminAuth();
  const [incluirFunc, setIncluirFunc] = useState(true);
  const [incluirEmpresa, setIncluirEmpresa] = useState(true);
  const [funcSrc, setFuncSrc] = useState<string | null>(null);
  const [empresaSrc, setEmpresaSrc] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    setCarregando(true);
    setFuncSrc(null);
    setEmpresaSrc(null);
    let cancelled = false;
    const adminId = user?.id && user.id > 0 ? user.id : 0;

    Promise.all([
      fetchAssinaturaUsuario(usuarioId),
      adminId ? fetchAssinaturaUsuario(adminId) : Promise.resolve(null),
    ])
      .then(([func, empresa]) => {
        if (cancelled) return;
        setFuncSrc(func);
        setEmpresaSrc(empresa);
        setIncluirFunc(Boolean(func));
        setIncluirEmpresa(Boolean(empresa));
      })
      .catch(() => {
        if (cancelled) return;
        setFuncSrc(null);
        setEmpresaSrc(null);
        setIncluirFunc(false);
        setIncluirEmpresa(false);
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, usuarioId, user?.id]);

  function confirmar() {
    if (confirmando) return;
    onConfirm({
      assFunc: incluirFunc && Boolean(funcSrc),
      assEmpresa: incluirEmpresa && Boolean(empresaSrc),
    });
  }

  const tituloAcao = acao === "abrir" ? "Ver folha" : "Baixar PDF";
  const nomeEmpresa = user?.nome?.trim() || "empresa";

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
            Marque o que deve entrar no PDF.
          </p>

          {carregando ? <p className="text-muted mb-0">Carregando assinaturas…</p> : null}

          <div className="dash-ponto-ass-cols">
            <label
              className={`dash-ponto-ass-col${incluirFunc && funcSrc ? " is-on" : ""}${funcSrc ? "" : " is-off"}`}
            >
              <span className="dash-ponto-ass-col__top">
                <input
                  type="checkbox"
                  checked={incluirFunc && Boolean(funcSrc)}
                  onChange={(e) => setIncluirFunc(e.target.checked)}
                  disabled={confirmando || carregando || !funcSrc}
                />
                <span className="dash-ponto-ass-col__papel">Funcionário</span>
              </span>
              <strong className="dash-ponto-ass-col__nome">{funcionarioNome}</strong>
              {!carregando && funcSrc ? (
                <span className="dash-ponto-ass-col__preview">
                  <AssinaturaPreviewImg src={funcSrc} alt="" />
                </span>
              ) : (
                <span className="dash-ponto-ass-col__vazio">
                  Ainda não gravou a assinatura na tela de Ponto.
                </span>
              )}
            </label>

            <label
              className={`dash-ponto-ass-col${incluirEmpresa && empresaSrc ? " is-on" : ""}${empresaSrc ? "" : " is-off"}`}
            >
              <span className="dash-ponto-ass-col__top">
                <input
                  type="checkbox"
                  checked={incluirEmpresa && Boolean(empresaSrc)}
                  onChange={(e) => setIncluirEmpresa(e.target.checked)}
                  disabled={confirmando || carregando || !empresaSrc}
                />
                <span className="dash-ponto-ass-col__papel">Empresa</span>
              </span>
              <strong className="dash-ponto-ass-col__nome">{nomeEmpresa}</strong>
              {!carregando && empresaSrc ? (
                <span className="dash-ponto-ass-col__preview">
                  <AssinaturaPreviewImg src={empresaSrc} alt="" />
                </span>
              ) : (
                <span className="dash-ponto-ass-col__vazio">
                  Grave em{" "}
                  <Link to="/painel/assinatura" className="dash-ponto-relatorio-modal__link">
                    Administração → Assinatura
                  </Link>
                  .
                </span>
              )}
            </label>
          </div>
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
            <i className={`bi ${acao === "abrir" ? "bi-eye" : "bi-download"}`} aria-hidden="true" />{" "}
            {confirmando ? "Gerando…" : tituloAcao}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
