import { useEffect, useRef } from "react";

import type { DashAlertOptions } from "@/lib/dash-ui-store";

type Props = {
  open: boolean;
  options: DashAlertOptions | null;
  onClose: () => void;
};

const VARIANT_ICON: Record<NonNullable<DashAlertOptions["variant"]>, string> = {
  success: "bi-check-circle",
  danger: "bi-exclamation-octagon",
  warning: "bi-exclamation-triangle",
  info: "bi-info-circle",
};

const VARIANT_MODAL: Record<NonNullable<DashAlertOptions["variant"]>, string> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  info: "primary",
};

export function DashAlertModal({ open, options, onClose }: Props) {
  const variant = options?.variant ?? "info";
  const modalVariant = VARIANT_MODAL[variant];
  const icon = options?.icon ?? VARIANT_ICON[variant];
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => okRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !options) return null;

  return (
    <>
      <div
        className="modal-backdrop fade show dash-alert-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`modal fade show d-block dash-alert-modal dash-alert-modal--${modalVariant}`}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dash-alert-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content dash-alert-modal__content">
            <div className="modal-body dash-alert-modal__body">
              <div className="dash-alert-modal__icon-wrap" aria-hidden="true">
                <i className={`bi ${icon}`} />
              </div>
              <h2 id="dash-alert-title" className="dash-alert-modal__title">
                {options.title ?? "Aviso"}
              </h2>
              <p className="dash-alert-modal__message">{options.message}</p>
            </div>
            <div className="modal-footer dash-alert-modal__footer dash-alert-modal__footer--single">
              <button
                ref={okRef}
                type="button"
                className="btn dash-alert-modal__btn-confirm"
                onClick={onClose}
              >
                {options.okText ?? "Entendi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
