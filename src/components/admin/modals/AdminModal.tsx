import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  dialogClass?: string;
  children: ReactNode;
};

/** Modal no estilo Bootstrap (classes do dashboard-saas.css). */
export function AdminModal({ open, onClose, dialogClass = "modal-lg", children }: Props) {
  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} aria-hidden="true" />
      <div
        className="modal fade show d-block dash-edit-modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`modal-dialog modal-fullscreen-md-down modal-dialog-centered ${dialogClass}`}
        >
          {children}
        </div>
      </div>
    </>
  );
}
