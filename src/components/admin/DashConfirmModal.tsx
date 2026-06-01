import { useEffect, useRef, type ReactNode } from "react";

export type DashConfirmVariant = "primary" | "danger" | "warning" | "success";

export type DashConfirmOptions = {
  title: string;
  message: string;
  /** Bloco opcional entre mensagem e botões (ex.: cartão do usuário). */
  detail?: ReactNode;
  /** Linha de ajuda abaixo da mensagem (ex.: como voltar ao admin). */
  hint?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DashConfirmVariant;
  icon?: string;
};

type Props = {
  open: boolean;
  options: DashConfirmOptions | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const VARIANT_ICON: Record<DashConfirmVariant, string> = {
  primary: "bi-box-arrow-in-right",
  danger: "bi-trash",
  warning: "bi-exclamation-triangle",
  success: "bi-check-circle",
};

export function DashConfirmModal({ open, options, loading = false, onConfirm, onCancel }: Props) {
  const variant = options?.variant ?? "primary";
  const icon = options?.icon ?? VARIANT_ICON[variant];
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => confirmRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open || !options) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show dash-alert-modal__backdrop"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        className={`modal fade show d-block dash-alert-modal dash-alert-modal--${variant}`}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dash-confirm-title"
        aria-describedby="dash-confirm-message"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) onCancel();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content dash-alert-modal__content">
            <div className="modal-body dash-alert-modal__body">
              <div className="dash-alert-modal__icon-wrap" aria-hidden="true">
                <i className={`bi ${icon}`} />
              </div>
              <h2 id="dash-confirm-title" className="dash-alert-modal__title">
                {options.title}
              </h2>
              <p id="dash-confirm-message" className="dash-alert-modal__message">
                {options.message}
              </p>
              {options.detail ? (
                <div className="dash-alert-modal__detail">{options.detail}</div>
              ) : null}
              {options.hint ? (
                <p className="dash-alert-modal__hint">
                  <i className="bi bi-info-circle" aria-hidden="true" />
                  {options.hint}
                </p>
              ) : null}
            </div>
            <div className="modal-footer dash-alert-modal__footer">
              <button
                type="button"
                className="btn dash-alert-modal__btn-cancel"
                onClick={onCancel}
                disabled={loading}
              >
                {options.cancelText ?? "Cancelar"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className="btn dash-alert-modal__btn-confirm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                    Aguarde…
                  </>
                ) : (
                  options.confirmText ?? "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
